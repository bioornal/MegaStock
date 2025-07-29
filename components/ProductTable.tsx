"use client";

import { useState, useEffect } from 'react';
import { getProducts, updateProduct, deleteProduct, registerSale } from '@/services/productService';
import { BRANDS } from '@/lib/constants';
import { Edit, Trash2, Check, X, Search, Filter } from 'lucide-react';

// Definición de la interfaz del producto
interface Product {
  id: number;
  name: string;
  brand: string;
  stock: number;
  price: number;
  image: string;
}

// Props del componente
interface ProductTableProps {
  onProductsChange?: () => void; // Callback para notificar cambios en el dashboard
}

const ProductTable = ({ onProductsChange }: ProductTableProps) => {
  // Estados del componente
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [sellQuantity, setSellQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  

  // Carga inicial de productos y configuración de marcas para el filtro
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const allProducts = await getProducts();
      setProducts(allProducts);
      
    } catch (err) {
      setError('No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Manejadores de acciones
  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditFormData(product);
  };

  const handleSave = async (id: number) => {
    if (!editFormData.name || !editFormData.brand || editFormData.stock == null || editFormData.price == null) {
      alert('Por favor, completa todos los campos.');
      return;
    }
    try {
      await updateProduct(id, editFormData as Product);
      setEditingId(null);
      loadProducts();
      onProductsChange?.();
    } catch (error) {
      alert('Error al actualizar el producto.');
    }
  };

  const handleSale = async (productId: number) => {
    if (sellQuantity <= 0) {
      alert('La cantidad debe ser mayor a cero.');
      return;
    }
    try {
      await registerSale(productId, sellQuantity);
      setSellingId(null);
      setSellQuantity(1);
      loadProducts();
      onProductsChange?.();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
      await deleteProduct(id);
      loadProducts();
      onProductsChange?.();
    }
  };
  
  // Filtrado de productos
  const filteredProducts = products
    .filter(product => selectedBrand ? product.brand === selectedBrand : true)
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (isLoading) return <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="row mb-3 g-2">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white"><Search size={18} /></span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white"><Filter size={18} /></span>
            <select 
              className="form-select" 
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">Todas las marcas</option>
              {BRANDS.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Stock</th>
              <th>Precio</th>
              <th className="text-center">Vender</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>{editingId === product.id ? <input type="text" className="form-control form-control-sm" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} /> : <strong>{product.name.toUpperCase()}</strong>}</td>
                <td>{editingId === product.id ? <input type="text" className="form-control form-control-sm" value={editFormData.brand} onChange={(e) => setEditFormData({...editFormData, brand: e.target.value})} /> : product.brand}</td>
                <td>{editingId === product.id ? <input type="number" className="form-control form-control-sm" value={editFormData.stock} onChange={(e) => setEditFormData({...editFormData, stock: parseInt(e.target.value)})} /> : product.stock}</td>
                <td>{editingId === product.id ? <input type="number" className="form-control form-control-sm" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: parseFloat(e.target.value)})} /> : `$${product.price.toLocaleString('es-CL')}`}</td>
                
                <td className="text-center">
                  {sellingId === product.id ? (
                    <div className="input-group input-group-sm" style={{width: '150px'}}>
                      <input type="number" className="form-control" value={sellQuantity} onChange={(e) => setSellQuantity(parseInt(e.target.value))} min="1" max={product.stock} onKeyDown={(e) => e.key === 'Enter' && handleSale(product.id)} />
                      <button className="btn btn-success" onClick={() => handleSale(product.id)}><Check size={16} /></button>
                      <button className="btn btn-secondary" onClick={() => setSellingId(null)}><X size={16} /></button>
                    </div>
                  ) : (
                    <button className="btn btn-success btn-sm" onClick={() => setSellingId(product.id)} disabled={product.stock === 0}>
                      Vender
                    </button>
                  )}
                </td>

                <td className="text-center">
                  {editingId === product.id ? (
                    <div className='d-flex justify-content-center'>
                      <button className="btn btn-primary btn-sm me-1" onClick={() => handleSave(product.id)}><Check size={16} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}><X size={16} /></button>
                    </div>
                  ) : (
                    <div className='d-flex justify-content-center'>
                      <button className="btn btn-outline-primary btn-sm me-1" onClick={() => handleEdit(product)}><Edit size={16} /></button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
