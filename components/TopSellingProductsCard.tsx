'use client';

import { useState, useEffect } from 'react';
import { getTopSellingProducts, TopSellingProduct } from '@/services/vendorService';
import { TrendingUp, Package2 } from 'lucide-react';

const TopSellingProductsCard = () => {
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const products = await getTopSellingProducts(5);
      setTopProducts(products);
    } catch (err) {
      console.error('Error fetching top selling products:', err);
      setError('Error al cargar productos más vendidos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopProducts();
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchTopProducts, 300000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="card text-white mb-3 bg-success shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <TrendingUp size={30} />
            <div className='ms-3'>
              <h5 className="card-title mb-1">Cargando...</h5>
              <p className="card-text mb-0 small">Productos más vendidos</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-white mb-3 bg-danger shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <TrendingUp size={30} />
            <div className='ms-3'>
              <h5 className="card-title mb-1">Error</h5>
              <p className="card-text mb-0 small">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="card text-white mb-3 bg-secondary shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <Package2 size={30} />
            <div className='ms-3'>
              <h5 className="card-title mb-1">Sin datos</h5>
              <p className="card-text mb-0 small">No hay ventas registradas</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card text-white mb-3 bg-success shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <TrendingUp size={24} className="me-2" />
          <h6 className="mb-0">🏆 Productos Más Vendidos</h6>
        </div>
        <small className="opacity-75">Top 5</small>
      </div>
      <div className="card-body p-0">
        <div className="list-group list-group-flush">
          {topProducts.map((product, index) => (
            <div key={product.product_id} className="list-group-item bg-success text-white border-0 py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark me-2 fw-bold">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="fw-bold small">
                        {product.product_name}
                      </div>
                      <div className="text-light small opacity-75">
                        {product.product_brand}
                        {product.product_color && ` - ${product.product_color}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-end">
                  <div className="fw-bold">
                    {product.total_quantity_sold} vendidos
                  </div>
                  <div className="small opacity-75">
                    {product.percentage_of_total_sales.toFixed(1)}% del total
                  </div>
                </div>
              </div>
              
              {/* Barra de progreso visual */}
              <div className="mt-2">
                <div className="progress" style={{ height: '4px' }}>
                  <div 
                    className="progress-bar bg-light" 
                    role="progressbar" 
                    style={{ width: `${product.percentage_of_total_sales}%` }}
                    aria-valuenow={product.percentage_of_total_sales} 
                    aria-valuemin={0} 
                    aria-valuemax={100}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer con resumen */}
        <div className="card-footer bg-success border-0 text-center">
          <small className="opacity-75">
            📊 Total unidades en top 5: {topProducts.reduce((sum, p) => sum + p.total_quantity_sold, 0)}
          </small>
        </div>
      </div>
    </div>
  );
};

export default TopSellingProductsCard;
