export interface Product {
  id: number;
  created_at: string;
  name: string;
  brand: string;
  stock: number;
  price: number;
  color: string;
  size?: string; // Opcional por si no todos los productos lo tienen
  category?: string; // Opcional
  sku?: string; // Opcional
  image?: string; // Opcional
}

export interface Customer {
  id?: number;
  created_at?: string;
  name: string;
  address: string;
  locality: string;
  province: string;
  cuit: string;
  phone: string;
  iva_condition: string;
  business_name?: string;
}

export interface Sale {
  id?: number;
  created_at?: string;
  vendor_id: number;
  cash_session_id: number;
  customer_id?: number;
  total_amount: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'qr';
  items: SaleItem[];
}

export interface SaleItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface Vendor {
  id: number;
  name: string;
}

export interface CashSession {
  id: number;
  vendor_id: number;
  start_amount: number;
  end_amount?: number;
  closed_at?: string;
}
