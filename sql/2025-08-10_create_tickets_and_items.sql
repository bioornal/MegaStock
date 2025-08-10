-- Crear tablas de tickets e items de venta (Opción A, sin eliminar sales)
-- Ejecutar en Supabase SQL Editor

-- 1) Tabla de tickets (venta maestra)
create table if not exists public.tickets (
  id bigserial primary key,
  cash_session_id bigint not null references public.cash_sessions(id) on delete restrict,
  customer_id bigint null references public.customers(id) on delete set null,
  ticket_number varchar(50) not null unique,
  payment_method varchar(20) not null check (payment_method in ('cash','card','qr','transfer')),
  subtotal numeric(12,2) not null default 0,
  iva_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_session on public.tickets(cash_session_id);
create index if not exists idx_tickets_created_at on public.tickets(created_at desc);

-- 2) Tabla de items de venta
create table if not exists public.sale_items (
  id bigserial primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_ticket on public.sale_items(ticket_id);
create index if not exists idx_sale_items_product on public.sale_items(product_id);

-- 3) Generador de ticket_number (YYYYMMDD-0001)
create or replace function public.generate_ticket_number_v2()
returns varchar(50) as $$
declare
  ticket_num varchar(50);
  current_date_str varchar(8);
  sequence_num integer;
begin
  current_date_str := to_char(now(), 'YYYYMMDD');
  select coalesce(max(cast(split_part(ticket_number, '-', 2) as integer)), 0) + 1
    into sequence_num
    from public.tickets
   where ticket_number like current_date_str || '-%'
     and ticket_number is not null;

  ticket_num := current_date_str || '-' || lpad(sequence_num::text, 4, '0');
  return ticket_num;
end;
$$ language plpgsql;

-- 4) Trigger para auto-asignar ticket_number
create or replace function public.set_ticket_number_v2()
returns trigger as $$
begin
  if (new.ticket_number is null or new.ticket_number = '') then
    new.ticket_number := public.generate_ticket_number_v2();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_ticket_number_v2 on public.tickets;
create trigger trigger_set_ticket_number_v2
  before insert on public.tickets
  for each row
  execute function public.set_ticket_number_v2();

-- 5) RPC/función transaccional para crear ticket + items y actualizar stock y caja
create or replace function public.create_ticket_with_items(
  p_cash_session_id bigint,
  p_customer_id bigint,
  p_payment_method varchar,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ticket_id bigint;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_iva numeric(12,2) := 0;
  v_row jsonb;
  v_product_id bigint;
  v_qty integer;
  v_unit numeric(12,2);
  v_item_total numeric(12,2);
  v_ticket jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Items vacíos';
  end if;

  -- Crear ticket (ticket_number por trigger)
  insert into public.tickets(cash_session_id, customer_id, payment_method)
  values (p_cash_session_id, nullif(p_customer_id, 0), p_payment_method)
  returning id into v_ticket_id;

  -- Insertar items y actualizar stock
  for v_row in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_row->>'product_id')::bigint;
    v_qty := (v_row->>'quantity')::integer;
    v_unit := (v_row->>'unit_price')::numeric;
    v_item_total := (v_row->>'total_amount')::numeric;

    insert into public.sale_items(ticket_id, product_id, quantity, unit_price, total_amount)
    values (v_ticket_id, v_product_id, v_qty, v_unit, v_item_total);

    -- Validar stock y descontar
    update public.products
       set stock = stock - v_qty
     where id = v_product_id
       and stock >= v_qty;

    if not found then
      raise exception 'Stock insuficiente para producto %', v_product_id;
    end if;

    v_subtotal := v_subtotal + (v_item_total / 1.21);
    v_total := v_total + v_item_total;

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id,
        'quantity', v_qty,
        'unit_price', v_unit,
        'total_amount', v_item_total
      )
    );
  end loop;

  v_iva := v_total - v_subtotal;

  -- Actualizar totales del ticket
  update public.tickets
     set subtotal = v_subtotal,
         iva_amount = v_iva,
         total_amount = v_total
   where id = v_ticket_id;

  -- Actualizar totales de la sesión de caja
  -- (sumamos todas las ventas de esa sesión)
  with sums as (
    select coalesce(sum(total_amount),0) as total,
           coalesce(sum(case when payment_method='cash' then total_amount else 0 end),0) as cash,
           coalesce(sum(case when payment_method='card' then total_amount else 0 end),0) as card,
           coalesce(sum(case when payment_method in ('qr','transfer') then total_amount else 0 end),0) as digital
      from public.tickets
     where cash_session_id = p_cash_session_id
  )
  update public.cash_sessions cs
     set total_sales = s.total,
         cash_sales = s.cash,
         card_sales = s.card,
         digital_sales = s.digital,
         cash_to_render = cs.opening_cash + s.cash
    from sums s
   where cs.id = p_cash_session_id;

  -- Respuesta
  select jsonb_build_object(
    'ticket', to_jsonb(t),
    'items', v_items
  ) into v_ticket
  from public.tickets t
  where t.id = v_ticket_id;

  return v_ticket;
end;
$$;

-- Nota: agregar políticas RLS según tus necesidades.
-- En desarrollo puedes desactivar RLS o crear políticas laxas para pruebas.
