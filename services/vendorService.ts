import { supabase } from '@/lib/supabase';

export interface Vendor {
  id: number;
  name: string;
  email?: string;
  active: boolean;
  created_at: string;
}

export interface CashSession {
  id: number;
  vendor_id: number;
  date: string;
  opening_cash: number;
  closing_cash?: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  digital_sales: number; // QR + Transferencias
  cash_to_render: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  vendor?: Vendor;
}

export interface Sale {
  id: number;
  cash_session_id: number;
  customer_id?: number | null;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'qr' | 'transfer';
  ticket_number?: string;
  needs_ticket?: boolean;
  created_at: string;
  product?: {
    name: string;
    brand: string;
    color?: string;
  };
  cash_session?: {
    vendor: {
      name: string;
    };
    date: string;
  };
  customer?: {
    name: string;
    business_name?: string;
  };
}

export interface SalesResponse {
  sales: Sale[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// Nuevo modelo: Ticket maestro y respuesta
export interface Ticket {
  id: number;
  cash_session_id: number;
  customer_id?: number | null;
  ticket_number: string;
  payment_method: 'cash' | 'card' | 'qr' | 'transfer';
  subtotal: number;
  iva_amount: number;
  total_amount: number;
  created_at: string;
  customer?: { name: string; business_name?: string } | null;
  cash_session?: { vendor: { name: string }, date: string } | null;
}

export interface TicketResponse {
  tickets: Ticket[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface TopSellingProduct {
  product_id: number;
  product_name: string;
  product_brand: string;
  product_color?: string;
  total_quantity_sold: number;
  total_revenue: number;
  sales_count: number;
  percentage_of_total_sales: number;
}

// Obtener todos los vendedores activos
export const getActiveVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
  return data || [];
};

// Listar tickets con paginación (simple) y conteo total
export const getAllTickets = async (page: number = 1, pageSize: number = 20): Promise<TicketResponse> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const query = supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(*),
      cash_session:cash_sessions(vendor:vendors(name), date)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    tickets: (data || []) as Ticket[],
    totalCount,
    totalPages,
    currentPage: page,
  };
};

// Buscar tickets con filtros básicos (método de pago y rango de fechas)
export const searchTickets = async (
  page: number = 1,
  pageSize: number = 20,
  filters: {
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<TicketResponse> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(*),
      cash_session:cash_sessions(vendor:vendors(name), date)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod);
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Error searching tickets:', error);
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    tickets: (data || []) as Ticket[],
    totalCount,
    totalPages,
    currentPage: page,
  };
};

// -------------------- NUEVO FLUJO DE TICKETS --------------------

// Crear ticket con items (llama a la RPC/función de Postgres)
export const createTicketWithItems = async (args: {
  cash_session_id: number;
  customer_id: number | null;
  items: { product_id: number; quantity: number; unit_price: number; total_amount: number }[];
  payments?: { payment_method: 'cash' | 'card' | 'qr' | 'transfer'; amount: number }[];
  // Deprecated: kept for backward compatibility. If provided and payments is undefined, backend will insert a single payment.
  payment_method?: 'cash' | 'card' | 'qr' | 'transfer';
}): Promise<{ ticket: Ticket; items: any[] }> => {
  const payload: any = {
    p_cash_session_id: args.cash_session_id,
    p_customer_id: args.customer_id ?? 0,
    p_items: args.items as any
  };
  if (args.payments && args.payments.length > 0) {
    payload.p_payments = args.payments;
  } else if (args.payment_method) {
    // fallback single payment for legacy flows
    payload.p_payments = [{ payment_method: args.payment_method, amount: args.items.reduce((s, it) => s + it.total_amount, 0) }];
  }

  const { data, error } = await supabase.rpc('create_ticket_with_items', payload);
  if (error) {
    console.error('Error create_ticket_with_items:', error);
    throw error;
  }
  // data: { ticket: {...}, items: [...] }
  return data as { ticket: Ticket; items: any[] };
};

// Tickets por sesión de caja (para cabecera y listados)
export const getTicketsBySession = async (sessionId: number): Promise<Ticket[]> => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(name, business_name),
      cash_session:cash_sessions(vendor:vendors(name), date)
    `)
    .eq('cash_session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tickets by session:', error);
    throw error;
  }
  return data || [];
};

// Traer ticket con items para impresión/detalle
export const getTicketWithItems = async (ticketId: number): Promise<{
  ticket: Ticket;
  items: Array<{ id: number; product_id: number; quantity: number; unit_price: number; total_amount: number; product: { name: string; brand: string; color?: string } }>;
}> => {
  const { data: ticketData, error: tErr } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(*),
      cash_session:cash_sessions(vendor:vendors(name), date)
    `)
    .eq('id', ticketId)
    .single();

  if (tErr) {
    console.error('Error fetching ticket:', tErr);
    throw tErr;
  }

  const { data: itemsData, error: iErr } = await supabase
    .from('sale_items')
    .select(`
      *,
      product:products(name, brand, color)
    `)
    .eq('ticket_id', ticketId)
    .order('id');

  if (iErr) {
    console.error('Error fetching ticket items:', iErr);
    throw iErr;
  }

  return { ticket: ticketData as Ticket, items: (itemsData || []) as any };
};

// Crear nuevo vendedor
export const createVendor = async (vendorData: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor> => {
  const { data, error } = await supabase
    .from('vendors')
    .insert(vendorData)
    .select()
    .single();

  if (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
  return data;
};

// Asignar ticket_number a un conjunto de ventas (fallback si el trigger no lo generó)
export const assignTicketToSales = async (saleIds: number[], ticketNumber: string): Promise<void> => {
  if (!saleIds.length) return;
  const { error } = await supabase
    .from('sales')
    .update({ ticket_number: ticketNumber, needs_ticket: true })
    .in('id', saleIds);

  if (error) {
    console.error('Error assigning ticket to sales:', error);
    throw error;
  }
};

// Abrir caja diaria
export const openCashSession = async (vendorId: number, openingCash: number): Promise<CashSession> => {
  const today = new Date().toISOString().split('T')[0];

  // Verificar si ya hay una caja abierta hoy para este vendedor
  const { data: existingSession } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('date', today)
    .eq('status', 'open')
    .single();

  if (existingSession) {
    throw new Error('Ya existe una caja abierta para este vendedor hoy');
  }

  const sessionData = {
    vendor_id: vendorId,
    date: today,
    opening_cash: openingCash,
    total_sales: 0,
    cash_sales: 0,
    card_sales: 0,
    digital_sales: 0,
    cash_to_render: openingCash,
    status: 'open' as const,
    opened_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('cash_sessions')
    .insert(sessionData)
    .select(`
      *,
      vendor:vendors(*)
    `)
    .single();

  if (error) {
    console.error('Error opening cash session:', error);
    throw error;
  }
  return data;
};

// Obtener sesión de caja activa del vendedor
export const getActiveCashSession = async (vendorId: number): Promise<CashSession | null> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cash_sessions')
    .select(`
      *,
      vendor:vendors(*)
    `)
    .eq('vendor_id', vendorId)
    .eq('date', today)
    .eq('status', 'open')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active cash session:', error);
    throw error;
  }
  return data || null;
};

// Registrar venta
export const registerSale = async (saleData: Omit<Sale, 'id' | 'created_at'>): Promise<Sale> => {
  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...saleData,
      needs_ticket: saleData.needs_ticket ?? true, // Por defecto genera ticket
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      product:products(name, brand, color)
    `)
    .single();

  if (error) {
    console.error('Error registering sale:', error);
    throw error;
  }

  // Actualizar stock del producto
  await supabase.rpc('decrement_product_stock', {
    product_id: saleData.product_id,
    quantity: saleData.quantity
  });

  // Actualizar totales de la sesión de caja
  await updateCashSessionTotals(saleData.cash_session_id);

  return data;
};

// Actualizar totales de la sesión de caja
const updateCashSessionTotals = async (sessionId: number) => {
  const { data: sales } = await supabase
    .from('sales')
    .select('total_amount, payment_method')
    .eq('cash_session_id', sessionId);

  if (!sales) return;

  const totals = sales.reduce((acc, sale) => {
    acc.total += sale.total_amount;
    switch (sale.payment_method) {
      case 'cash':
        acc.cash += sale.total_amount;
        break;
      case 'card':
        acc.card += sale.total_amount;
        break;
      case 'qr':
      case 'transfer':
        acc.digital += sale.total_amount;
        break;
    }
    return acc;
  }, { total: 0, cash: 0, card: 0, digital: 0 });

  // Obtener monto de apertura para calcular dinero a rendir
  const { data: session } = await supabase
    .from('cash_sessions')
    .select('opening_cash')
    .eq('id', sessionId)
    .single();

  const cashToRender = (session?.opening_cash || 0) + totals.cash;

  await supabase
    .from('cash_sessions')
    .update({
      total_sales: totals.total,
      cash_sales: totals.cash,
      card_sales: totals.card,
      digital_sales: totals.digital,
      cash_to_render: cashToRender
    })
    .eq('id', sessionId);
};

// Cerrar caja
export const closeCashSession = async (sessionId: number, closingCash: number): Promise<CashSession> => {
  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      closing_cash: closingCash,
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select(`
      *,
      vendor:vendors(*)
    `)
    .single();

  if (error) {
    console.error('Error closing cash session:', error);
    throw error;
  }
  return data;
};

// Obtener ventas de una sesión
export const getSalesBySession = async (sessionId: number): Promise<Sale[]> => {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      product:products(name, brand, color)
    `)
    .eq('cash_session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
    throw error;
  }
  return data || [];
};

// Obtener sesiones de caja por fecha
export const getCashSessionsByDate = async (date: string): Promise<CashSession[]> => {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select(`
      *,
      vendor:vendors(*)
    `)
    .eq('date', date)
    .order('opened_at');

  if (error) {
    console.error('Error fetching cash sessions:', error);
    throw error;
  }
  return data || [];
};

// Obtener total de ventas mensuales (del 1 al último día del mes actual)
export const getMonthlySalesTotal = async (): Promise<{
  totalSales: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  sessionsCount: number;
  month: string;
  year: number;
}> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() devuelve 0-11

  // Primer día del mes
  const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;

  // Último día del mes
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('cash_sessions')
    .select('total_sales, cash_sales, card_sales, digital_sales')
    .gte('date', firstDay)
    .lte('date', lastDayFormatted);

  if (error) {
    console.error('Error fetching monthly sales:', error);
    throw error;
  }

  const totals = (data || []).reduce((acc, session) => {
    acc.totalSales += session.total_sales || 0;
    acc.cashSales += session.cash_sales || 0;
    acc.cardSales += session.card_sales || 0;
    acc.digitalSales += session.digital_sales || 0;
    return acc;
  }, {
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    digitalSales: 0
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return {
    ...totals,
    sessionsCount: data?.length || 0,
    month: monthNames[month - 1],
    year
  };
};

// Resetear ventas mensuales (eliminar todas las cash_sessions del mes actual)
export const resetMonthlySales = async (): Promise<{ deletedCount: number }> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Primer día del mes
  const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;

  // Último día del mes
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  // Primero eliminar todas las ventas asociadas a las sesiones del mes
  const { data: sessionsToDelete } = await supabase
    .from('cash_sessions')
    .select('id')
    .gte('date', firstDay)
    .lte('date', lastDayFormatted);

  if (sessionsToDelete && sessionsToDelete.length > 0) {
    const sessionIds = sessionsToDelete.map(s => s.id);

    // Eliminar ventas asociadas
    const { error: salesError } = await supabase
      .from('sales')
      .delete()
      .in('cash_session_id', sessionIds);

    if (salesError) {
      console.error('Error deleting sales:', salesError);
      throw salesError;
    }
  }

  // Luego eliminar las sesiones de caja del mes
  const { data, error } = await supabase
    .from('cash_sessions')
    .delete()
    .gte('date', firstDay)
    .lte('date', lastDayFormatted)
    .select();

  if (error) {
    console.error('Error resetting monthly sales:', error);
    throw error;
  }

  return {
    deletedCount: data?.length || 0
  };
};

// Obtener todas las ventas con paginación
export const getAllSales = async (page: number = 1, pageSize: number = 20): Promise<SalesResponse> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Obtener el total de ventas
  const { count } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true });

  // Obtener las ventas con paginación
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      product:products(name, brand, color),
      cash_session:cash_sessions(
        vendor:vendors(name),
        date
      ),
      customer:customers(name, business_name)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching all sales:', error);
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    sales: data || [],
    totalCount,
    totalPages,
    currentPage: page
  };
};

// Buscar ventas por filtros con paginación
export const searchSales = async (
  page: number = 1,
  pageSize: number = 20,
  filters: {
    vendorName?: string;
    customerName?: string;
    productName?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<SalesResponse> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('sales')
    .select(`
      *,
      product:products(name, brand, color),
      cash_session:cash_sessions(
        vendor:vendors(name),
        date
      ),
      customer:customers(name, business_name)
    `, { count: 'exact' });

  // Aplicar filtros
  if (filters.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error searching sales:', error);
    throw error;
  }

  // Filtrar por nombre de vendedor, cliente o producto en el frontend
  // ya que Supabase no permite filtros complejos en relaciones
  let filteredData = data || [];

  if (filters.vendorName) {
    filteredData = filteredData.filter(sale =>
      sale.cash_session?.vendor?.name?.toLowerCase().includes(filters.vendorName!.toLowerCase())
    );
  }

  if (filters.customerName) {
    filteredData = filteredData.filter(sale =>
      sale.customer?.name?.toLowerCase().includes(filters.customerName!.toLowerCase()) ||
      sale.customer?.business_name?.toLowerCase().includes(filters.customerName!.toLowerCase())
    );
  }

  if (filters.productName) {
    filteredData = filteredData.filter(sale =>
      sale.product?.name?.toLowerCase().includes(filters.productName!.toLowerCase()) ||
      sale.product?.brand?.toLowerCase().includes(filters.productName!.toLowerCase())
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    sales: filteredData,
    totalCount,
    totalPages,
    currentPage: page
  };
};

// Obtener productos más vendidos (desde sale_items - sistema nuevo de tickets)
export const getTopSellingProducts = async (
  limit: number = 5,
  startDate?: string,
  endDate?: string
): Promise<TopSellingProduct[]> => {
  // Primero obtener los IDs de tickets en el rango de fechas (si aplica)
  let ticketQuery = supabase
    .from('tickets')
    .select('id, created_at');

  if (startDate) {
    ticketQuery = ticketQuery.gte('created_at', startDate);
  }
  if (endDate) {
    ticketQuery = ticketQuery.lte('created_at', endDate);
  }

  const { data: ticketsData, error: ticketsError } = await ticketQuery;

  if (ticketsError) {
    console.error('Error fetching tickets for top products:', ticketsError);
    throw ticketsError;
  }

  if (!ticketsData || ticketsData.length === 0) {
    return [];
  }

  const ticketIds = ticketsData.map(t => t.id);

  // Ahora obtener sale_items de esos tickets
  const { data: saleItemsData, error: itemsError } = await supabase
    .from('sale_items')
    .select(`
      product_id,
      quantity,
      total_amount,
      product:products(name, brand, color)
    `)
    .in('ticket_id', ticketIds);

  if (itemsError) {
    console.error('Error fetching sale_items for top products:', itemsError);
    throw itemsError;
  }

  if (!saleItemsData || saleItemsData.length === 0) {
    return [];
  }

  // Calcular totales generales
  const totalQuantitySold = saleItemsData.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = saleItemsData.reduce((sum, item) => sum + item.total_amount, 0);

  // Agrupar por producto
  const productStats = saleItemsData.reduce((acc, item) => {
    const productId = item.product_id;

    if (!acc[productId]) {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      acc[productId] = {
        product_id: productId,
        product_name: product?.name || 'Producto desconocido',
        product_brand: product?.brand || 'Marca desconocida',
        product_color: product?.color,
        total_quantity_sold: 0,
        total_revenue: 0,
        sales_count: 0,
        percentage_of_total_sales: 0
      };
    }

    acc[productId].total_quantity_sold += item.quantity;
    acc[productId].total_revenue += item.total_amount;
    acc[productId].sales_count += 1;

    return acc;
  }, {} as Record<number, TopSellingProduct>);

  // Convertir a array y calcular porcentajes
  const productsArray = Object.values(productStats).map(product => ({
    ...product,
    percentage_of_total_sales: totalQuantitySold > 0
      ? (product.total_quantity_sold / totalQuantitySold) * 100
      : 0
  }));

  // Ordenar por cantidad vendida (descendente) y tomar los primeros N
  return productsArray
    .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold)
    .slice(0, limit);
};

// Obtener ventas agrupadas por número de ticket
export const getSalesByTicketNumber = async (ticketNumber: string): Promise<Sale[]> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        product:products(name, brand, color),
        customer:customers(name, business_name),
        cash_session:cash_sessions(
          vendor:vendors(name),
          date
        )
      `)
      .eq('ticket_number', ticketNumber)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching sales by ticket:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSalesByTicketNumber:', error);
    throw error;
  }
};
