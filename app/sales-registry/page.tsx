'use client';

import { useState, useEffect } from 'react';
import { getAllSales, searchSales, SalesResponse, Sale } from '@/services/vendorService';
import { useDebounce } from '@/lib/hooks';

const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  qr: 'QR',
  transfer: 'Transferencia'
};

const PAYMENT_METHOD_COLORS = {
  cash: 'success',
  card: 'primary',
  qr: 'warning',
  transfer: 'info'
};

export default function SalesRegistryPage() {
  const [salesData, setSalesData] = useState<SalesResponse>({
    sales: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    vendorName: '',
    customerName: '',
    productName: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const debouncedFilters = useDebounce(filters, 500);

  const loadSales = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Si hay filtros activos, usar búsqueda
      const hasFilters = Object.values(debouncedFilters).some(value => value !== '');
      
      let response: SalesResponse;
      if (hasFilters) {
        response = await searchSales(page, 20, debouncedFilters);
      } else {
        response = await getAllSales(page, 20);
      }
      
      setSalesData(response);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales(1);
  }, [debouncedFilters]);

  const handlePageChange = (page: number) => {
    loadSales(page);
  };

  const clearFilters = () => {
    setFilters({
      vendorName: '',
      customerName: '',
      productName: '',
      paymentMethod: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  📊 Registro de Ventas
                </h4>
                <div className="text-end">
                  <small>
                    Total: {salesData.totalCount} ventas
                  </small>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Filtros */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title mb-3">🔍 Filtros de Búsqueda</h6>
                      
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label">Vendedor</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por vendedor..."
                            value={filters.vendorName}
                            onChange={(e) => setFilters({...filters, vendorName: e.target.value})}
                          />
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label">Cliente</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por cliente..."
                            value={filters.customerName}
                            onChange={(e) => setFilters({...filters, customerName: e.target.value})}
                          />
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label">Producto</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por producto..."
                            value={filters.productName}
                            onChange={(e) => setFilters({...filters, productName: e.target.value})}
                          />
                        </div>
                        
                        <div className="col-md-3">
                          <label className="form-label">Método de Pago</label>
                          <select
                            className="form-select"
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                          >
                            <option value="">Todos</option>
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="qr">QR</option>
                            <option value="transfer">Transferencia</option>
                          </select>
                        </div>
                        
                        <div className="col-md-4">
                          <label className="form-label">Fecha Desde</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                          />
                        </div>
                        
                        <div className="col-md-4">
                          <label className="form-label">Fecha Hasta</label>
                          <input
                            type="date"
                            className="form-control"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                          />
                        </div>
                        
                        <div className="col-md-4 d-flex align-items-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary w-100"
                            onClick={clearFilters}
                          >
                            🗑️ Limpiar Filtros
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de Ventas */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando ventas...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : salesData.sales.length === 0 ? (
                <div className="text-center py-5">
                  <h5 className="text-muted">📭 No se encontraron ventas</h5>
                  <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Vendedor</th>
                          <th>Cliente</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio Unit.</th>
                          <th>Total</th>
                          <th>Método Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.sales.map((sale: Sale) => (
                          <tr key={sale.id}>
                            <td>
                              <small className="text-muted">#{sale.id}</small>
                            </td>
                            <td>
                              <small>{formatDate(sale.created_at)}</small>
                            </td>
                            <td>
                              <span className="badge bg-secondary">
                                {sale.cash_session?.vendor?.name || 'N/A'}
                              </span>
                            </td>
                            <td>
                              {sale.customer ? (
                                <div>
                                  <div className="fw-bold">{sale.customer.name}</div>
                                  {sale.customer.business_name && (
                                    <small className="text-muted">{sale.customer.business_name}</small>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted">Sin cliente</span>
                              )}
                            </td>
                            <td>
                              <div>
                                <div className="fw-bold">{sale.product?.name || 'N/A'}</div>
                                <small className="text-muted">
                                  {sale.product?.brand} {sale.product?.color && `- ${sale.product.color}`}
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-info">{sale.quantity}</span>
                            </td>
                            <td>
                              <small>{formatCurrency(sale.unit_price)}</small>
                            </td>
                            <td>
                              <strong className="text-success">
                                {formatCurrency(sale.total_amount)}
                              </strong>
                            </td>
                            <td>
                              <span className={`badge bg-${PAYMENT_METHOD_COLORS[sale.payment_method]}`}>
                                {PAYMENT_METHOD_LABELS[sale.payment_method]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {salesData.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <div>
                        <small className="text-muted">
                          Página {salesData.currentPage} de {salesData.totalPages} 
                          ({salesData.totalCount} ventas en total)
                        </small>
                      </div>
                      
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${salesData.currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(salesData.currentPage - 1)}
                              disabled={salesData.currentPage === 1}
                            >
                              Anterior
                            </button>
                          </li>
                          
                          {Array.from({ length: Math.min(5, salesData.totalPages) }, (_, i) => {
                            let pageNum;
                            if (salesData.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (salesData.currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (salesData.currentPage >= salesData.totalPages - 2) {
                              pageNum = salesData.totalPages - 4 + i;
                            } else {
                              pageNum = salesData.currentPage - 2 + i;
                            }
                            
                            return (
                              <li key={pageNum} className={`page-item ${salesData.currentPage === pageNum ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}
                          
                          <li className={`page-item ${salesData.currentPage === salesData.totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(salesData.currentPage + 1)}
                              disabled={salesData.currentPage === salesData.totalPages}
                            >
                              Siguiente
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
