'use client';

import { useState, useEffect } from 'react';
import { getAllTickets, searchTickets, TicketResponse, Ticket, getTicketWithItems } from '@/services/vendorService';
import { getDefaultCustomer, TicketData } from '@/services/customerService';
import { useDebounce } from '@/lib/hooks';
import TicketPrint from '@/components/TicketPrint';
import { FileText } from 'lucide-react';

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
  const [ticketsData, setTicketsData] = useState<TicketResponse>({
    tickets: [],
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
    paymentMethod: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const debouncedFilters = useDebounce(filters, 500);

  const loadTickets = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const hasFilters = Object.values(debouncedFilters).some(value => value !== '');
      let response: TicketResponse;
      if (hasFilters) {
        response = await searchTickets(page, 20, debouncedFilters as any);
      } else {
        response = await getAllTickets(page, 20);
      }
      setTicketsData(response);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Error al cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets(1);
  }, [debouncedFilters]);

  const handlePageChange = (page: number) => {
    loadTickets(page);
  };

  const clearFilters = () => {
    setFilters({ paymentMethod: '', dateFrom: '', dateTo: '' });
  };

  // Funciones para manejar tickets
  const handleShowTicket = async (ticket: Ticket) => {
    try {
      setTicketLoading(true);
      const detail = await getTicketWithItems(ticket.id);
      const defaultCustomer = await getDefaultCustomer();
      const td: TicketData = {
        ticket_number: ticket.ticket_number,
        customer: (ticket.customer as any) || defaultCustomer,
        sale_items: detail.items.map(it => {
          const totalFinal = it.total_amount;
          const subtotalNeto = totalFinal / 1.21;
          const unitPriceFinal = it.unit_price;
          const unitPriceNeto = unitPriceFinal / 1.21;
          return {
            product_name: it.product?.name || 'Producto',
            brand: it.product?.brand || '',
            quantity: it.quantity,
            unit_price: unitPriceFinal,
            total_amount: totalFinal,
            unit_price_without_iva: unitPriceNeto,
            subtotal_without_iva: subtotalNeto,
          };
        }),
        subtotal: ticket.subtotal,
        iva_amount: ticket.iva_amount,
        total: ticket.total_amount,
        payment_method: ticket.payment_method,
        created_at: ticket.created_at,
        vendor_name: (ticket.cash_session as any)?.vendor?.name || 'Vendedor',
      };
      setTicketData(td);
      setShowTicket(true);
    } catch (error) {
      console.error('Error generando ticket:', error);
      setError('Error al generar el ticket');
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

  return (
    <>
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
                    Total: {ticketsData.totalCount} tickets
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
                        <div className="col-md-4">
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

              {/* Tabla de Tickets */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-2">Cargando tickets...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : ticketsData.tickets.length === 0 ? (
                <div className="text-center py-5">
                  <h5 className="text-muted">📭 No se encontraron tickets</h5>
                  <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Ticket</th>
                          <th>Fecha</th>
                          <th>Vendedor</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th>Método Pago</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketsData.tickets.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <small className="text-muted d-block">{t.ticket_number}</small>
                            </td>
                            <td>
                              <small>{formatDate(t.created_at)}</small>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{(t.cash_session as any)?.vendor?.name || 'N/A'}</span>
                            </td>
                            <td>
                              {t.customer ? (
                                <div>
                                  <div className="fw-bold">{(t.customer as any)?.name}</div>
                                  {(t.customer as any)?.business_name && (
                                    <small className="text-muted">{(t.customer as any)?.business_name}</small>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted">Sin cliente</span>
                              )}
                            </td>
                            <td>
                              <strong className="text-success">
                                {formatCurrency(t.total_amount)}
                              </strong>
                            </td>
                            <td>
                              <span className={`badge bg-${PAYMENT_METHOD_COLORS[t.payment_method as keyof typeof PAYMENT_METHOD_COLORS]}`}>
                                {PAYMENT_METHOD_LABELS[t.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleShowTicket(t)}
                                disabled={ticketLoading}
                              >
                                <FileText size={16} className="me-1" /> Ver Ticket
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {ticketsData.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <div>
                        <small>Mostrando página {ticketsData.currentPage} de {ticketsData.totalPages}</small>
                      </div>
                      <div className="btn-group">
                        <button className="btn btn-outline-secondary" disabled={ticketsData.currentPage <= 1} onClick={() => handlePageChange(ticketsData.currentPage - 1)}>Anterior</button>
                        <button className="btn btn-outline-secondary" disabled={ticketsData.currentPage >= ticketsData.totalPages} onClick={() => handlePageChange(ticketsData.currentPage + 1)}>Siguiente</button>
                      </div>
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
