"use client";

import { useState, useEffect, useMemo, KeyboardEvent, useCallback } from 'react';
import { Product, getProducts, updateProduct, deleteProduct } from '@/services/productService';
import { BRANDS } from '@/lib/productOptions';
import { Edit, Trash2, Check, X, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce, useLocalCache } from '@/lib/hooks';

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
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // 20 productos por página

  // Cache local y debounce
  const [cachedProducts, setCachedProducts] = useLocalCache<Product[]>('megastock_products', []);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Carga inicial de productos
  const loadProducts = useCallback(async (useCache = true) => {
    setIsLoading(true);
    try {
      // Si hay cache y se permite usarlo, usar cache primero
      if (useCache && cachedProducts.length > 0) {
        setProducts(cachedProducts);
        setIsLoading(false);

        // Cargar en background para actualizar cache
        const freshProducts = await getProducts();
        if (JSON.stringify(freshProducts) !== JSON.stringify(cachedProducts)) {
          setProducts(freshProducts);
          setCachedProducts(freshProducts);
        }
      } else {
        // Carga completa
        const allProducts = await getProducts();
        setProducts(allProducts);
        setCachedProducts(allProducts);
      }
    } catch (err) {
      setError('No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
    }
  }, [cachedProducts, setCachedProducts]);


  // Manejar Enter/Escape en inputs de edición
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      const password = prompt("Para actualizar este producto, por favor introduce la contraseña:");
      if (password === "110685") {
        await updateProduct(id, editFormData as Product);
      } else if (password !== null) {
        alert("Contraseña incorrecta.");
        return;
      } else {
        return;
      }
      setEditingId(null);
      loadProducts(false); // Forzar recarga sin cache
      onProductsChange?.();
    } catch (error) {
      alert('Error al actualizar el producto.');
    }
  };



  const handleDelete = async (id: number) => {
    if (confirm('¿Seguro que quieres eliminar este producto?')) {
      const password = prompt("Para eliminar este producto, por favor introduce la contraseña:");
      if (password === "110685") {
        await deleteProduct(id);
      } else if (password !== null) {
        alert("Contraseña incorrecta.");
        return;
      }
      loadProducts(false); // Forzar recarga sin cache
      onProductsChange?.();
    }
  };

  // Helper para normalizar strings (ignorar tildes y mayúsculas)
  const normalizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
      .normalize('NFD') // Separa caracteres de sus acentos
      .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
      .toLowerCase(); // Convierte a minúsculas
  };

  // Filtrado de productos con debounce y normalización
  const filteredProducts = useMemo(() => {
    const normalizedTerm = normalizeText(debouncedSearchTerm);

    if (!normalizedTerm && !selectedBrand) {
      return products;
    }

    return products
      .filter(product => selectedBrand ? normalizeText(product.brand) === normalizeText(selectedBrand) : true)
      .filter(product => {
        if (!normalizedTerm) return true;
        return (
          normalizeText(product.name).includes(normalizedTerm) ||
          normalizeText(product.brand).includes(normalizedTerm) ||
          normalizeText(product.color).includes(normalizedTerm)
        );
      });
  }, [products, selectedBrand, debouncedSearchTerm]);

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedBrand]);

  // Componente de paginación
  const PaginationControls = () => (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <div className="text-muted small">
        Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} productos
      </div>
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="mx-2 small">
          Página {currentPage} de {totalPages}
        </span>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );



  if (isLoading && products.length === 0) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

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
              placeholder="Buscar por nombre, marca o color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center gap-2">
          <div className="input-group flex-grow-1">
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
          <a href="/admin/inventory-value" className="btn btn-outline-success border-2 fw-medium d-flex align-items-center gap-1" style={{ whiteSpace: 'nowrap' }}>
            📊 Costos
          </a>
        </div>
      </div>

      {/* Indicador de carga en background */}
      {isLoading && products.length > 0 && (
        <div className="alert alert-info py-2 mb-3">
          <small>Actualizando datos...</small>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Color</th>
              <th>Stock</th>
              <th>Precio</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map(product => (
              <tr key={product.id}>
                <td>{editingId === product.id ? <input type="text" className="form-control form-control-sm" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} onKeyDown={(e) => handleKeyDown(e, product.id)} /> : <strong>{product.name.toUpperCase()}</strong>}</td>
                <td>{editingId === product.id ? <input type="text" className="form-control form-control-sm" value={editFormData.brand} onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })} onKeyDown={(e) => handleKeyDown(e, product.id)} /> : product.brand}</td>
                <td>{editingId === product.id ? <input type="text" className="form-control form-control-sm" value={editFormData.color || ''} onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })} onKeyDown={(e) => handleKeyDown(e, product.id)} /> : (product.color || '-')}</td>
                <td>{editingId === product.id ? <input type="number" className="form-control form-control-sm" value={editFormData.stock} onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, product.id)} /> : product.stock}</td>
                <td>{editingId === product.id ? <input type="number" className="form-control form-control-sm" value={editFormData.price} onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) })} onKeyDown={(e) => handleKeyDown(e, product.id)} /> : `$${product.price.toLocaleString('es-CL')}`}</td>

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

      {/* Controles de paginación */}
      {totalPages > 1 && <PaginationControls />}

      {/* Mensaje cuando no hay resultados */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-4 text-muted">
          No se encontraron productos que coincidan con los filtros aplicados.
        </div>
      )}
    </div>
  );
};

export default ProductTable;
