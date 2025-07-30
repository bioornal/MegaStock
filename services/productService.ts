import { supabase } from '@/lib/supabase';

export interface Product {
  id: number;
  name: string;
  brand: string;
  color?: string; // Color es opcional para productos existentes
  stock: number;
  price: number;
  image: string;
}

// Lista de marcas disponibles (esto podría venir de otra tabla en el futuro)
export const brands = [
  "Demobile",
  "Mosconi",
  "Molufan",
  "Super Espuma",
  "Piero",
  "San Jose",
  "DJ",
  "Moval"
];

// Obtener todos los productos
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
  return data || [];
};

// Actualizar un producto completo
export const updateProduct = async (productId: number, productData: Partial<Product>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }
  return data;
};

// Registrar una venta
export const registerSale = async (productId: number, quantity: number): Promise<void> => {
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    console.error('Error fetching product for sale:', fetchError);
    throw new Error('Producto no encontrado.');
  }

  if (quantity > product.stock) {
    throw new Error(`No hay suficiente stock. Disponible: ${product.stock}`);
  }

  const newStock = product.stock - quantity;
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);

  if (updateError) {
    console.error('Error updating stock after sale:', updateError);
    throw new Error('No se pudo registrar la venta.');
  }
};

// Agregar un nuevo producto
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error);
    throw error;
  }
  return data;
};

// Incrementar stock de un producto existente
export const incrementStock = async (productId: number, quantity: number): Promise<Product> => {
  // Primero obtenemos el producto actual
  const { data: currentProduct, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchError) {
    console.error('Error fetching product:', fetchError);
    throw fetchError;
  }

  // Calculamos el nuevo stock
  const newStock = currentProduct.stock + quantity;

  // Actualizamos el stock
  const { data, error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('Error updating stock:', error);
    throw error;
  }

  return data;
};

// Actualizar stock de múltiples productos de forma masiva
export const bulkIncrementStock = async (updates: { productId: number; quantity: number }[]): Promise<Product[]> => {
  const updatedProducts: Product[] = [];
  const errors: string[] = [];

  for (const update of updates) {
    try {
      const updatedProduct = await incrementStock(update.productId, update.quantity);
      updatedProducts.push(updatedProduct);
    } catch (error) {
      errors.push(`Error actualizando producto ID ${update.productId}: ${error}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Algunos productos no se pudieron actualizar: ${errors.join(', ')}`);
  }

  return updatedProducts;
};

// Eliminar un producto
export const deleteProduct = async (productId: number): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

