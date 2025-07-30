"use client";

import { useState, useEffect, useRef } from 'react';
import { getProducts, incrementStock, Product } from '@/services/productService';
import { Search, Plus, Minus, Save, Package, AlertTriangle, CheckCircle2, Loader2, History } from 'lucide-react';

interface StockUpdateFormProps {
  onStockUpdate?: () => void;
}

const StockUpdateForm = ({ onStockUpdate }: StockUpdateFormProps) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [updatedToday, setUpdatedToday] = useState<Product[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await getProducts();
        setAllProducts(products);
      } catch (error) {
        handleError('No se pudieron cargar los productos.');
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      setIsSearching(true);
      const handler = setTimeout(() => {
        const filtered = allProducts.filter(p => {
          const term = searchTerm.toLowerCase();
          return p.name.toLowerCase().includes(term) ||
                 p.brand.toLowerCase().includes(term) ||
                 (p.color && p.color.toLowerCase().includes(term));
        });
        setFilteredProducts(filtered.slice(0, 5));
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, allProducts]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    setFilteredProducts([]);
    setQuantity(1);
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct || quantity < 1) {
      handleError('Selecciona un producto y una cantidad válida.');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const updatedProduct = await incrementStock(selectedProduct.id, quantity);
      handleSuccess(`Stock de ${updatedProduct.name} actualizado.`);
      
      setUpdatedToday(prev => [updatedProduct, ...prev]);
      setSelectedProduct(null);
      setQuantity(1);
      
      // Actualizar la lista principal de productos para reflejar el cambio
      setAllProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      
      onStockUpdate?.();
    } catch (error) {
      handleError('Error al actualizar el stock.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (text: string) => setMessage({ type: 'error', text });
  const handleSuccess = (text: string) => setMessage({ type: 'success', text });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-8">
      {/* --- Panel de Actualización --- */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Actualizar Stock</h2>
        <p className="text-sm text-slate-500 mb-4">Busca un producto para añadir stock.</p>

        {/* Búsqueda */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 animate-spin" />}
        </div>

        {/* Resultados de Búsqueda */}
        {searchTerm && filteredProducts.length > 0 && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <div className="flex-grow">
                  <span className="font-medium text-slate-800 text-sm">{product.name}</span>
                  <span className="text-xs text-slate-500 ml-2">({product.brand} {product.color && `- ${product.color}`})</span>
                </div>
                <div className="text-xs text-slate-600 mr-3">Stock: {product.stock}</div>
                <Plus className="h-4 w-4 text-indigo-500" />
              </div>
            ))}
          </div>
        )}

        {/* Formulario de Actualización */}
        {selectedProduct && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Producto</label>
                <div className="p-2 bg-slate-100 rounded-md border border-slate-200">
                  <p className="font-bold text-sm text-slate-800">{selectedProduct.name}</p>
                  <p className="text-xs text-slate-500">{selectedProduct.brand} {selectedProduct.color && `- ${selectedProduct.color}`}</p>
                  <p className="text-xs text-slate-500 mt-1">Stock: {selectedProduct.stock}</p>
                </div>
              </div>
              <div className="md:col-span-1">
                <label htmlFor="quantity" className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
                <div className="flex items-center">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 bg-slate-200 text-slate-600 rounded-l-md hover:bg-slate-300"><Minus size={14} /></button>
                  <input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full text-center font-semibold text-base border-y border-slate-300 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button onClick={() => setQuantity(q => q + 1)} className="p-2 bg-slate-200 text-slate-600 rounded-r-md hover:bg-slate-300"><Plus size={14} /></button>
                </div>
              </div>
              <div className="md:col-span-1">
                <button
                  onClick={handleUpdateStock}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 transition-all"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {isLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Mensajes de Alerta */}
        {message && (
            <div className={`mt-6 p-4 rounded-lg border-l-4 flex items-center gap-3 text-sm font-medium ${
              message.type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {message.text}
            </div>
        )}
      </div>

      {/* --- Lista de Actualizados Hoy --- */}
      {updatedToday.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">Actualizados en la Sesión</h2>
          </div>
          <div className="-mx-6 overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="pl-6 pr-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Producto</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {updatedToday.map((product, index) => (
                    <tr key={`${product.id}-${index}`}>
                      <td className="pl-6 pr-3 py-2 whitespace-nowrap text-sm">
                        <span className="font-medium text-slate-800">{product.name}</span>
                        <span className="text-slate-500 ml-2">({product.brand} {product.color && `- ${product.color}`})</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                        <span className="font-bold text-indigo-600">{product.stock}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockUpdateForm;
