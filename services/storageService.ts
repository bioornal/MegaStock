const STORAGE_KEY = 'megastock_products';

// Verificar si estamos en el lado del cliente
const isClient = typeof window !== 'undefined';

// Guardar productos en localStorage
export const saveProducts = (products: any[]) => {
  if (!isClient) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Error saving products to localStorage:', error);
  }
};

// Cargar productos desde localStorage
export const loadProducts = () => {
  if (!isClient) return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading products from localStorage:', error);
    return null;
  }
};

// Limpiar datos almacenados
export const clearStorage = () => {
  if (!isClient) return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};
