import { supabase } from '@/lib/supabase';

export interface Order {
  id: number;
  cash_session_id: number;
  customer_id?: number | null;
  ticket_number: string;
  subtotal: number;
  iva_amount: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'qr' | 'transfer';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
    business_name?: string;
    customer_type: string;
    cuit_dni?: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  cash_session?: {
    vendor: {
      name: string;
    };
  };
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  apply_promotion: boolean;
  created_at: string;
  product?: {
    name: string;
    brand: string;
    color?: string;
  };
}

export interface CreateOrderData {
  cash_session_id: number;
  customer_id?: number | null;
  payment_method: 'cash' | 'card' | 'qr' | 'transfer';
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    apply_promotion?: boolean;
  }[];
}

export interface OrdersResponse {
  orders: Order[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// Crear nueva orden con múltiples productos
export const createOrder = async (orderData: CreateOrderData): Promise<Order> => {
  try {
    // 1. Crear la orden principal
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        cash_session_id: orderData.cash_session_id,
        customer_id: orderData.customer_id,
        payment_method: orderData.payment_method,
        status: 'completed' // Directamente completada
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    // 2. Crear los items de la orden
    const orderItems = orderData.items.map(item => {
      let subtotal = item.unit_price * item.quantity;
      
      // Aplicar promoción 2x1 si corresponde
      if (item.apply_promotion && item.quantity >= 2) {
        subtotal = item.unit_price * (item.quantity - 1);
      }
      
      return {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: subtotal,
        apply_promotion: item.apply_promotion || false
      };
    });

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select(`
        *,
        product:products(name, brand, color)
      `);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      throw itemsError;
    }

    // 3. Obtener la orden completa con todos los datos
    const { data: completeOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        cash_session:cash_sessions(
          vendor:vendors(name)
        ),
        order_items:order_items(
          *,
          product:products(name, brand, color)
        )
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete order:', fetchError);
      throw fetchError;
    }

    // 4. Actualizar totales de la sesión de caja
    await updateCashSessionTotals(orderData.cash_session_id);

    return completeOrder;
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
};

// Obtener orden por ID con todos sus items
export const getOrderById = async (orderId: number): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      cash_session:cash_sessions(
        vendor:vendors(name)
      ),
      order_items:order_items(
        *,
        product:products(name, brand, color)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No encontrado
    }
    console.error('Error fetching order:', error);
    throw error;
  }
  return data;
};

// Obtener órdenes por sesión de caja
export const getOrdersBySession = async (sessionId: number): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      order_items:order_items(
        *,
        product:products(name, brand, color)
      )
    `)
    .eq('cash_session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders by session:', error);
    throw error;
  }
  return data || [];
};

// Obtener todas las órdenes con paginación
export const getAllOrders = async (page: number = 1, pageSize: number = 20): Promise<OrdersResponse> => {
  const offset = (page - 1) * pageSize;

  // Obtener total de registros
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting orders:', countError);
    throw countError;
  }

  // Obtener órdenes paginadas
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(name, business_name),
      cash_session:cash_sessions(
        vendor:vendors(name),
        date
      ),
      order_items:order_items(
        quantity,
        product:products(name, brand, color)
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    orders: data || [],
    totalCount,
    totalPages,
    currentPage: page
  };
};

// Buscar órdenes con filtros
export const searchOrders = async (
  page: number = 1,
  pageSize: number = 20,
  filters: {
    vendorName?: string;
    customerName?: string;
    ticketNumber?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<OrdersResponse> => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(name, business_name),
      cash_session:cash_sessions(
        vendor:vendors(name),
        date
      ),
      order_items:order_items(
        quantity,
        product:products(name, brand, color)
      )
    `, { count: 'exact' });

  // Aplicar filtros
  if (filters.ticketNumber) {
    query = query.ilike('ticket_number', `%${filters.ticketNumber}%`);
  }

  if (filters.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Filtros que requieren joins se manejan en el frontend por simplicidad
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error searching orders:', error);
    throw error;
  }

  let filteredData = data || [];

  // Aplicar filtros de texto en el frontend
  if (filters.vendorName) {
    filteredData = filteredData.filter(order => 
      order.cash_session?.vendor?.name?.toLowerCase().includes(filters.vendorName!.toLowerCase())
    );
  }

  if (filters.customerName) {
    filteredData = filteredData.filter(order => 
      order.customer?.name?.toLowerCase().includes(filters.customerName!.toLowerCase()) ||
      order.customer?.business_name?.toLowerCase().includes(filters.customerName!.toLowerCase())
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    orders: filteredData,
    totalCount,
    totalPages,
    currentPage: page
  };
};

// Actualizar totales de la sesión de caja (adaptado para órdenes)
const updateCashSessionTotals = async (sessionId: number) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_amount, payment_method')
    .eq('cash_session_id', sessionId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching orders for session totals:', error);
    return;
  }

  const totals = orders.reduce(
    (acc, order) => {
      acc.total_sales += order.total_amount;
      
      switch (order.payment_method) {
        case 'cash':
          acc.cash_sales += order.total_amount;
          break;
        case 'card':
          acc.card_sales += order.total_amount;
          break;
        case 'qr':
        case 'transfer':
          acc.digital_sales += order.total_amount;
          break;
      }
      
      return acc;
    },
    { total_sales: 0, cash_sales: 0, card_sales: 0, digital_sales: 0 }
  );

  // Calcular dinero a rendir (apertura + ventas en efectivo)
  const { data: session } = await supabase
    .from('cash_sessions')
    .select('opening_cash')
    .eq('id', sessionId)
    .single();

  const cash_to_render = (session?.opening_cash || 0) + totals.cash_sales;

  await supabase
    .from('cash_sessions')
    .update({
      ...totals,
      cash_to_render
    })
    .eq('id', sessionId);
};
