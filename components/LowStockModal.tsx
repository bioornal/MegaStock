"use client";

import { useState, useEffect } from 'react';
import { Product, getProducts } from '@/services/productService';
import { X, AlertTriangle, Package } from 'lucide-react';

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LowStockModal = ({ isOpen, onClose }: LowStockModalProps) => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLowStockProducts = async () => {
    setIsLoading(true);
    try {
      const products = await getProducts();
      const lowStock = products.filter(p => p.stock <= 2);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLowStockProducts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title d-flex align-items-center">
              <AlertTriangle size={24} className="me-2" />
              Productos con Bajo Stock (≤ 2 unidades)
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2 text-muted">Cargando productos con bajo stock...</p>
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-4">
                <Package size={48} className="text-success mb-3" />
                <h6 className="text-success">¡Excelente!</h6>
                <p className="text-muted">No hay productos con bajo stock en este momento.</p>
              </div>
            ) : (
              <>
                <div className="alert alert-warning d-flex align-items-center mb-3">
                  <AlertTriangle size={20} className="me-2" />
                  <div>
                    <strong>Atención:</strong> Se encontraron {lowStockProducts.length} productos con stock crítico.
                    <br />
                    <small>Considera reabastecer estos productos pronto.</small>
                  </div>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-warning">
                      <tr>
                        <th>Producto</th>
                        <th>Marca</th>
                        <th>Color</th>
                        <th className="text-center">Stock Actual</th>
                        <th className="text-end">Precio Unit.</th>
                        <th className="text-end">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map(product => (
                        <tr key={product.id} className={product.stock === 0 ? 'table-danger' : product.stock === 1 ? 'table-warning' : ''}>
                          <td>
                            <strong>{product.name.toUpperCase()}</strong>
                            {product.stock === 0 && (
                              <span className="badge bg-danger ms-2">SIN STOCK</span>
                            )}
                          </td>
                          <td>{product.brand}</td>
                          <td>{product.color || '-'}</td>
                          <td className="text-center">
                            <span className={`badge ${
                              product.stock === 0 ? 'bg-danger' : 
                              product.stock === 1 ? 'bg-warning text-dark' : 
                              'bg-secondary'
                            }`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="text-end">${product.price.toLocaleString('es-CL')}</td>
                          <td className="text-end">
                            <strong>${(product.price * product.stock).toLocaleString('es-CL')}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <th colSpan={5} className="text-end">Total en productos críticos:</th>
                        <th className="text-end">
                          ${lowStockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString('es-CL')}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cerrar
            </button>
            {lowStockProducts.length > 0 && (
              <button 
                type="button" 
                className="btn btn-warning"
                onClick={() => {
                  // Aquí se podría implementar navegación a la página de actualizar stock
                  window.location.href = '/stock';
                }}
              >
                Actualizar Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowStockModal;
