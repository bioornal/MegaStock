'use client';

import { useState, useEffect } from 'react';
import { getAllOrders, searchOrders, OrdersResponse, Order } from '@/services/orderService';
import { useDebounce } from '@/lib/hooks';
import TicketPrint from '@/components/TicketPrint';
import { FileText, Search, Filter, X } from 'lucide-react';

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

export default function OrdersRegistryPage() {
  const [ordersData, setOrdersData] = useState<OrdersResponse>({
    orders: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para tickets
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    vendorName: '',
    customerName: '',
    ticketNumber: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const debouncedFilters = useDebounce(filters, 500);

  const loadOrders = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Si hay filtros activos, usar búsqueda
      const hasFilters = Object.values(debouncedFilters).some(value => value !== '');
      
      let response: OrdersResponse;
      if (hasFilters) {
        response = await searchOrders(page, 20, debouncedFilters);
      } else {
        response = await getAllOrders(page, 20);
      }
      
      setOrdersData(response);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1);
  }, [debouncedFilters]);

  const handlePageChange = (page: number) => {
    loadOrders(page);
  };

  const clearFilters = () => {
    setFilters({
      vendorName: '',
      customerName: '',
      ticketNumber: '',
      paymentMethod: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Funciones para manejar tickets
  const handleShowOrderTicket = async (order: Order) => {
    try {
      setTicketLoading(true);
      
      // Crear datos del ticket desde la orden
      const ticketInfo = {
        ticket_number: order.ticket_number,
        customer: order.customer || {
          id: 0,
          name: 'Consumidor Final',
          customer_type: 'consumidor_final',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        sale_items: (order.order_items || []).map(item => ({
          product_name: item.product?.name || 'Producto',
          brand: item.product?.brand || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.subtotal * 1.21, // Incluir IVA
          unit_price_without_iva: item.unit_price / 1.21,
          subtotal_without_iva: item.subtotal
        })),
        subtotal: order.subtotal,
        iva_amount: order.iva_amount,
        total: order.total_amount,
        payment_method: order.payment_method,
        created_at: order.created_at,
        vendor_name: order.cash_session?.vendor?.name || 'Vendedor'
      };
      
      setTicketData(ticketInfo);
      setShowTicket(true);
    } catch (error) {
      console.error('Error generando ticket:', error);
      setError('Error al generar el ticket. Verifica que la orden tenga todos los datos necesarios.');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleTicketPrinted = () => {
    setShowTicket(false);
    setTicketData(null);
  };

  const handleTicketClosed = () => {
    setShowTicket(false);
    setTicketData(null);
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

  const getTotalItems = (order: Order) => {
    return (order.order_items || []).reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <>
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  🛒 Registro de Compras/Órdenes
                </h4>
                <div className="text-end">
                  <small>
                    Total: {ordersData.totalCount} órdenes
                  </small>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {/* Filtros */}
              <div className="row mb-4">
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
                <div className="col-md-2">
                  <label className="form-label">Ticket</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Número de ticket..."
                    value={filters.ticketNumber}
                    onChange={(e) => setFilters({...filters, ticketNumber: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
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
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={clearFilters}
                    title="Limpiar filtros"
                  >
                    <X size={16} className="me-1" />
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Filtros de fecha */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <label className="form-label">Fecha desde</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Fecha hasta</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2 text-muted">Cargando órdenes...</p>
                </div>
              ) : (
                <>
                  {ordersData.orders.length === 0 ? (
                    <div className="text-center py-5">
                      <FileText size={48} className="text-muted mb-3" />
                      <h5 className="text-muted">No se encontraron órdenes</h5>
                      <p className="text-muted">No hay órdenes que coincidan con los filtros aplicados.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Fecha</th>
                            <th>Ticket</th>
                            <th>Vendedor</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Método</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordersData.orders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <small>{formatDate(order.created_at)}</small>
                              </td>
                              <td>
                                <span className="font-monospace text-primary">
                                  {order.ticket_number}
                                </span>
                              </td>
                              <td>
                                <small>{order.cash_session?.vendor?.name || 'N/A'}</small>
                              </td>
                              <td>
                                {order.customer ? (
                                  <div>
                                    <div className="fw-bold">{order.customer.name}</div>
                                    {order.customer.business_name && (
                                      <small className="text-muted">{order.customer.business_name}</small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">Consumidor Final</span>
                                )}
                              </td>
                              <td>
                                <div>
                                  {(order.order_items || []).slice(0, 2).map((item, idx) => (
                                    <div key={idx}>
                                      <small className="fw-bold">{item.product?.name || 'N/A'}</small>
                                      <br />
                                      <small className="text-muted">
                                        {item.product?.brand} {item.product?.color && `- ${item.product.color}`}
                                      </small>
                                    </div>
                                  ))}
                                  {(order.order_items?.length || 0) > 2 && (
                                    <small className="text-muted">
                                      +{(order.order_items?.length || 0) - 2} productos más
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-info fs-6">
                                  {getTotalItems(order)}
                                </span>
                              </td>
                              <td>
                                <strong className="text-success">
                                  {formatCurrency(order.total_amount)}
                                </strong>
                              </td>
                              <td>
                                <span className={`badge bg-${PAYMENT_METHOD_COLORS[order.payment_method]}`}>
                                  {PAYMENT_METHOD_LABELS[order.payment_method]}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleShowOrderTicket(order)}
                                  disabled={ticketLoading}
                                  title={`Ver e imprimir ticket ${order.ticket_number}`}
                                >
                                  {ticketLoading ? (
                                    <div className="spinner-border spinner-border-sm" role="status">
                                      <span className="visually-hidden">Cargando...</span>
                                    </div>
                                  ) : (
                                    <FileText size={14} />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Paginación */}
                  {ordersData.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <div>
                        <small className="text-muted">
                          Página {ordersData.currentPage} de {ordersData.totalPages} 
                          ({ordersData.totalCount} órdenes en total)
                        </small>
                      </div>
                      
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${ordersData.currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(ordersData.currentPage - 1)}
                              disabled={ordersData.currentPage === 1}
                            >
                              Anterior
                            </button>
                          </li>
                          
                          {Array.from({ length: Math.min(5, ordersData.totalPages) }, (_, i) => {
                            let pageNum;
                            if (ordersData.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (ordersData.currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (ordersData.currentPage >= ordersData.totalPages - 2) {
                              pageNum = ordersData.totalPages - 4 + i;
                            } else {
                              pageNum = ordersData.currentPage - 2 + i;
                            }
                            
                            return (
                              <li key={pageNum} className={`page-item ${ordersData.currentPage === pageNum ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          })}
                          
                          <li className={`page-item ${ordersData.currentPage === ordersData.totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(ordersData.currentPage + 1)}
                              disabled={ordersData.currentPage === ordersData.totalPages}
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

    {/* Modal de ticket */}
    {showTicket && ticketData && (
      <TicketPrint
        ticketData={ticketData}
        onClose={handleTicketClosed}
        onPrint={handleTicketPrinted}
      />
    )}
    </>
  );
}
