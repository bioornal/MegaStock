'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTopSellingProducts, TopSellingProduct } from '@/services/vendorService';
import { TrendingUp, Package2, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const TopSellingProductsCard = () => {
  const [allProducts, setAllProducts] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [brandFilter, setBrandFilter] = useState<string>('');

  const getDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start = new Date(now);

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case 'all':
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const fetchTopProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange(timeRange);
      const products = await getTopSellingProducts(100, startDate, endDate);
      setAllProducts(products);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching top selling products:', err);
      setError('Error al cargar productos más vendidos');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchTopProducts();
  }, [fetchTopProducts]);

  // Get unique brands for filter dropdown
  const uniqueBrands = useMemo(() => {
    const brands = Array.from(new Set(allProducts.map(p => p.product_brand))).filter(Boolean).sort();
    return brands;
  }, [allProducts]);

  // Filter by brand
  const filteredProducts = useMemo(() => {
    if (!brandFilter) return allProducts;
    return allProducts.filter(p => p.product_brand === brandFilter);
  }, [allProducts, brandFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [brandFilter]);

  if (isLoading) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-muted">Cargando productos más vendidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <TrendingUp size={20} className="me-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      {/* Header con filtros */}
      <div className="card-header bg-success text-white">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <TrendingUp size={20} className="me-2" />
            <h6 className="mb-0">🏆 Top 100 Más Vendidos</h6>
          </div>
          <small>{filteredProducts.length} productos</small>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-body py-2 bg-light border-bottom">
        <div className="row g-2 align-items-center">
          {/* Filtro de tiempo */}
          <div className="col-auto">
            <div className="btn-group btn-group-sm">
              {(['today', 'week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  className={`btn ${timeRange === range ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setTimeRange(range)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Histórico'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de marca */}
          <div className="col-auto">
            <select
              className="form-select form-select-sm"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              style={{ fontSize: '0.75rem', padding: '0.2rem 1.5rem 0.2rem 0.5rem' }}
            >
              <option value="">Todas las marcas</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-responsive">
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-4">
            <Package2 size={40} className="text-muted mb-2" />
            <p className="text-muted mb-0">No hay ventas en este periodo</p>
          </div>
        ) : (
          <table className="table table-sm table-striped table-hover mb-0" style={{ fontSize: '0.8rem' }}>
            <thead className="table-dark">
              <tr>
                <th style={{ width: '40px', padding: '0.3rem 0.5rem' }}>#</th>
                <th style={{ padding: '0.3rem 0.5rem' }}>Producto</th>
                <th style={{ padding: '0.3rem 0.5rem' }}>Marca</th>
                <th style={{ padding: '0.3rem 0.5rem' }}>Color</th>
                <th className="text-end" style={{ padding: '0.3rem 0.5rem' }}>Vendidos</th>
                <th className="text-end" style={{ padding: '0.3rem 0.5rem' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => {
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                return (
                  <tr key={product.product_id}>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <span className={`badge ${globalIndex <= 3 ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {globalIndex}
                      </span>
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }} className="text-truncate" title={product.product_name}>
                      {product.product_name}
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <small className="text-muted">{product.product_brand}</small>
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <small className="text-muted">{product.product_color || '-'}</small>
                    </td>
                    <td className="text-end fw-bold" style={{ padding: '0.25rem 0.5rem' }}>
                      {product.total_quantity_sold}
                    </td>
                    <td className="text-end" style={{ padding: '0.25rem 0.5rem' }}>
                      <small className="text-success">{product.percentage_of_total_sales.toFixed(1)}%</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="card-footer bg-light py-2">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Pág. {currentPage} de {totalPages}
            </small>
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer con totales */}
      {filteredProducts.length > 0 && (
        <div className="card-footer bg-success text-white py-1 text-center">
          <small>
            Total vendidos: <strong>{filteredProducts.reduce((sum, p) => sum + p.total_quantity_sold, 0)}</strong> unidades
          </small>
        </div>
      )}
    </div>
  );
};

export default TopSellingProductsCard;
