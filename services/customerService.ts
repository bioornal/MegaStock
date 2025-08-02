import { supabase } from '@/lib/supabase';

export interface Customer {
  id: number;
  name: string;
  business_name?: string; // Razón social
  address?: string;
  city?: string; // Ciudad/Localidad
  province?: string; // Provincia
  cuit_dni?: string;
  email?: string;
  phone?: string;
  customer_type: 'consumidor_final' | 'responsable_inscripto' | 'monotributista';
  created_at: string;
  updated_at: string;
}

export interface TicketData {
  ticket_number: string;
  customer: Customer;
  sale_items: {
    product_name: string;
    brand: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    unit_price_without_iva: number;
    subtotal_without_iva: number;
  }[];
  subtotal: number;
  iva_amount: number;
  total: number;
  payment_method: string;
  created_at: string;
  vendor_name: string;
}

// Obtener todos los clientes
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
  return data || [];
};

// Buscar cliente por nombre, razón social o CUIT/DNI
export const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,business_name.ilike.%${searchTerm}%,cuit_dni.ilike.%${searchTerm}%`)
      .order('name');

    if (error) {
      console.error('Error searching customers:', error);
      throw new Error(`Error al buscar clientes: ${error.message}`);
    }
    return data || [];
  } catch (error: any) {
    console.error('Error in searchCustomers:', error);
    throw new Error(`Error al buscar clientes: ${error.message || 'Error desconocido'}`);
  }
};

// Crear nuevo cliente
export const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...customerData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
  return data;
};

// Buscar cliente por CUIT/DNI
export const findCustomerByCuitDni = async (cuitDni: string): Promise<Customer | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('cuit_dni', cuitDni)
      .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores cuando no hay resultados

    if (error) {
      console.error('Error finding customer:', error);
      throw new Error(`Error al buscar cliente: ${error.message}`);
    }
    
    return data || null;
  } catch (error: any) {
    console.error('Error in findCustomerByCuitDni:', error);
    throw new Error(`Error al buscar cliente: ${error.message || 'Error desconocido'}`);
  }
};

// Obtener cliente "Consumidor Final" por defecto
export const getDefaultCustomer = async (): Promise<Customer> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_type', 'consumidor_final')
      .eq('name', 'Consumidor Final')
      .maybeSingle();

    if (error) {
      console.error('Error fetching default customer:', error);
      throw new Error(`Error al obtener cliente por defecto: ${error.message}`);
    }
    
    // Si no existe, crear el cliente "Consumidor Final"
    if (!data) {
      console.log('Cliente "Consumidor Final" no existe, creándolo...');
      return await createCustomer({
        name: 'Consumidor Final',
        customer_type: 'consumidor_final',
        address: '',
        cuit_dni: '',
        email: '',
        phone: '',
        business_name: ''
      });
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in getDefaultCustomer:', error);
    // Si falla todo, devolver un cliente temporal
    return {
      id: 0,
      name: 'Consumidor Final',
      customer_type: 'consumidor_final' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
};

// Actualizar cliente
export const updateCustomer = async (id: number, customerData: Partial<Customer>): Promise<Customer> => {
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...customerData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
  return data;
};

// Obtener datos completos para generar ticket
export const getTicketData = async (saleIds: number[]): Promise<TicketData> => {
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      *,
      product:products(name, brand),
      customer:customers!inner(*),
      cash_session:cash_sessions(
        vendor:vendors(name)
      )
    `)
    .in('id', saleIds);

  if (salesError) {
    console.error('Error fetching ticket data:', salesError);
    throw salesError;
  }

  if (!salesData || salesData.length === 0) {
    throw new Error('No se encontraron datos de venta para el ticket');
  }

  // Agrupar y procesar items por producto
  const saleItems = salesData.map(sale => {
    // CÁLCULO CORRECTO: El total_amount es lo que paga el cliente (precio final con IVA incluido)
    const totalFinal = sale.total_amount; // Precio final que paga el cliente
    const subtotalNeto = totalFinal / 1.21; // Base imponible (precio sin IVA)
    const ivaItem = totalFinal - subtotalNeto; // IVA discriminado
    
    const unitPriceFinal = sale.unit_price; // Precio unitario final que paga el cliente
    const unitPriceNeto = unitPriceFinal / 1.21; // Precio unitario sin IVA
    
    return {
      product_name: sale.product?.name || 'Producto no disponible',
      brand: sale.product?.brand || '',
      quantity: sale.quantity,
      unit_price: unitPriceFinal, // Precio unitario final con IVA (lo que paga)
      total_amount: totalFinal, // Total final con IVA (lo que paga)
      unit_price_without_iva: unitPriceNeto, // Precio unitario neto
      subtotal_without_iva: subtotalNeto // Subtotal neto
    };
  });

  // CÁLCULO CORRECTO DEL TICKET:
  // Total = suma de todos los total_amount (precio final que paga el cliente)
  const total = salesData.reduce((sum, sale) => sum + sale.total_amount, 0);
  // Subtotal = total / 1.21 (base imponible, precio neto sin IVA)
  const subtotal = total / 1.21;
  // IVA = total - subtotal (IVA discriminado)
  const iva_amount = total - subtotal;

  // Usar el primer registro para obtener datos comunes
  const firstSale = salesData[0];
  
  return {
    ticket_number: firstSale.ticket_number || 'SIN-TICKET',
    customer: firstSale.customer || await getDefaultCustomer(),
    sale_items: saleItems,
    subtotal,
    iva_amount,
    total,
    payment_method: firstSale.payment_method,
    created_at: firstSale.created_at,
    vendor_name: firstSale.cash_session?.vendor?.name || 'Vendedor'
  };
};
