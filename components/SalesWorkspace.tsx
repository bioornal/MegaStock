"use client";

import { useState, useEffect, useCallback } from 'react';
import { CashSession, Ticket, getTicketsBySession, createTicketWithItems, getTicketWithItems } from '@/services/vendorService';
import { getProducts, Product } from '@/services/productService';
import { Customer, getDefaultCustomer, TicketData } from '@/services/customerService';
import { ShoppingCart, Plus, Trash2, CreditCard, Smartphone, DollarSign, Search, Save, AlertCircle, User, FileText, Minus, X, Package, Users, Receipt } from 'lucide-react';
import { useDebounce } from '@/lib/hooks';
import { salesPersistence } from '@/lib/salesPersistence';
import CustomerForm from './CustomerForm';
import TicketPrint from './TicketPrint';

interface SalesWorkspaceProps {
  cashSession: CashSession;
  onSaleRegistered: () => void;
}

interface SaleItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  applyPromotion: boolean;
}

type PaymentMethod = 'cash' | 'card' | 'qr' | 'transfer';
interface PaymentSplit { method: PaymentMethod; amount: number }

const SalesWorkspace = ({ cashSession, onSaleRegistered }: SalesWorkspaceProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [salesItems, setSalesItems] = useState<SaleItem[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentSplit[]>([{ method: 'cash', amount: 0 }]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, ticketsData] = await Promise.all([
          getProducts(),
          getTicketsBySession(cashSession.id)
        ]);
        setProducts(productsData);
        setRecentTickets(ticketsData);

        const pendingDraft = salesPersistence.hasPendingDrafts(cashSession.vendor_id, cashSession.id);
        setHasPendingDraft(pendingDraft);

        if (pendingDraft) {
          const summary = salesPersistence.getDraftSummary(cashSession.vendor_id, cashSession.id);
          setDraftSummary(summary);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [cashSession.id, cashSession.vendor_id]);

  // Filtrar productos basado en búsqueda
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    const availableProducts = products.filter(p => p.stock > 0);
    const filtered = availableProducts.filter(product => {
      const name = product.name?.toLowerCase() ?? '';
      const brand = (product.brand ?? '').toLowerCase();
      const color = (product.color ?? '').toLowerCase();
      return (
        name.includes(searchLower) ||
        brand.includes(searchLower) ||
        color.includes(searchLower)
      );
    });
    setFilteredProducts(filtered);
  }, [debouncedSearchTerm, products]);

  // Auto-guardar draft cuando cambian los items
  useEffect(() => {
    if (salesItems.length > 0) {
      const draftItems = salesItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        applyPromotion: item.applyPromotion
      }));

      salesPersistence.saveDraft(cashSession.vendor_id, cashSession.id, draftItems);
    }
  }, [salesItems, cashSession.vendor_id, cashSession.id]);

  const addProductToSale = (product: Product) => {
    const existingIndex = salesItems.findIndex(item => item.product.id === product.id);

    if (existingIndex >= 0) {
      const newItems = [...salesItems];
      if (newItems[existingIndex].quantity < product.stock) {
        newItems[existingIndex].quantity += 1;
        setSalesItems(newItems);
      }
    } else {
      const newItem: SaleItem = {
        product,
        quantity: 1,
        unitPrice: product.price,
        applyPromotion: false
      };
      setSalesItems([...salesItems, newItem]);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...salesItems];
    newItems[index].quantity = Math.min(quantity, newItems[index].product.stock);
    setSalesItems(newItems);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newItems = [...salesItems];
    newItems[index].unitPrice = Math.max(0, price);
    setSalesItems(newItems);
  };

  // Cálculo de subtotal por ítem (debe declararse antes de ser usada)
  function calculateItemSubtotal(item: SaleItem): number {
    const baseSubtotal = item.quantity * item.unitPrice;
    if (item.applyPromotion && item.quantity >= 2) {
      const freeItems = Math.floor(item.quantity / 2);
      return baseSubtotal - (freeItems * item.unitPrice);
    }
    return baseSubtotal;
  }

  // Ticket-level payments handling
  const totalAmount = useCallback((): number => salesItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0), [salesItems]);
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remainingToAssign = Math.max(0, totalAmount() - paymentsTotal);

  const setSinglePaymentCoveringTotal = () => {
    setPayments([{ method: 'cash', amount: totalAmount() }]);
  };

  useEffect(() => {
    // Auto-adjust first payment to cover total if only one line exists
    if (payments.length === 1) {
      const currentTotal = totalAmount();
      if (payments[0].amount !== currentTotal) {
        setPayments([{ ...payments[0], amount: currentTotal }]);
      }
    }
  }, [payments, totalAmount]);

  const addPaymentLine = (method: PaymentMethod) => {
    const remaining = totalAmount() - paymentsTotal;
    const amount = Math.max(0, remaining);
    setPayments(prev => [...prev, { method, amount }]);
  };

  const updatePaymentMethod = (idx: number, method: PaymentMethod) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, method } : p));
  };

  const updatePaymentAmount = (idx: number, amount: number) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, amount: Math.max(0, amount) } : p));
  };

  const removePaymentLine = (idx: number) => {
    setPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePromotionChange = (index: number, apply: boolean) => {
    const newItems = [...salesItems];
    newItems[index].applyPromotion = apply;
    setSalesItems(newItems);
  };

  const removeProductFromSale = (index: number) => {
    const newItems = salesItems.filter((_, i) => i !== index);
    setSalesItems(newItems);
  };

  const clearSale = () => {
    setSalesItems([]);
    setSelectedCustomer(null);
    setError('');
    salesPersistence.clearDraft(cashSession.vendor_id, cashSession.id);
  };

  const calculateSubtotal = (): number => {
    return salesItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculatePromotionDiscount = (): number => {
    return salesItems.reduce((discount, item) => {
      if (item.applyPromotion && item.quantity >= 2) {
        const freeItems = Math.floor(item.quantity / 2);
        return discount + (freeItems * item.unitPrice);
      }
      return discount;
    }, 0);
  };

  const calculateTotal = (): number => {
    return salesItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  };

  const handleProcessSale = async () => {
    if (salesItems.length === 0) return;

    setIsLoading(true);
    setError('');

    try {
      // Validar pagos divididos a nivel ticket
      if (payments.length === 0) {
        setSinglePaymentCoveringTotal();
      }
      const total = totalAmount();
      const sum = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      if (Math.round(sum) !== Math.round(total)) {
        throw new Error('La suma de los pagos no coincide con el total del ticket.');
      }
      for (const p of payments) {
        if (!['cash', 'card', 'qr', 'transfer'].includes(p.method)) {
          throw new Error('Método de pago inválido.');
        }
        if (p.amount < 0) {
          throw new Error('Los montos de pago no pueden ser negativos.');
        }
      }

      // Construir items para la RPC
      const itemsPayload = salesItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: calculateItemSubtotal(item),
      }));

      // Crear ticket + items en una sola transacción
      const result = await createTicketWithItems({
        cash_session_id: cashSession.id,
        customer_id: selectedCustomer?.id || null,
        items: itemsPayload,
        payments: payments.map(p => ({ payment_method: p.method, amount: p.amount })) as any,
      });

      // Cargar detalle completo para impresión/visualización
      const detail = await getTicketWithItems(result.ticket.id);
      // Mapear a la forma TicketData usada por TicketPrint
      const defaultCustomer = await getDefaultCustomer();
      const td: TicketData = {
        ticket_number: detail.ticket.ticket_number,
        customer: (detail.ticket.customer as any) || defaultCustomer,
        sale_items: detail.items.map(it => {
          const totalFinal = it.total_amount; // total con IVA
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
        subtotal: detail.ticket.subtotal,
        iva_amount: detail.ticket.iva_amount,
        total: detail.ticket.total_amount,
        payment_method: detail.ticket.payment_method,
        created_at: detail.ticket.created_at,
        vendor_name: (detail.ticket.cash_session as any)?.vendor?.name || 'Vendedor',
      };
      setTicketData(td);
      setShowTicket(true);

      // Limpiar formulario
      clearSale();
      onSaleRegistered();

      // Actualizar tickets recientes
      try {
        const updatedTickets = await getTicketsBySession(cashSession.id);
        setRecentTickets(updatedTickets);
      } catch (err) {
        console.error('Error updating recent items:', err);
      }
    } catch (e: any) {
      console.error('Error al procesar la venta:', e);
      setError(e?.message || 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  const recoverDraft = async () => {
    try {
      const recoveredItems = await salesPersistence.recoverDraft(cashSession.vendor_id, cashSession.id, products);
      setSalesItems(recoveredItems);
      setHasPendingDraft(false);
      setDraftSummary('');
    } catch (error) {
      console.error('Error recovering draft:', error);
      setError('Error al recuperar los datos guardados');
    }
  };

  const discardDraft = () => {
    salesPersistence.clearDraft(cashSession.vendor_id, cashSession.id);
    setHasPendingDraft(false);
    setDraftSummary('');
  };

  return (
    <div className="container-fluid px-0">
      {/* Draft pendiente */}
      {hasPendingDraft && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-info border-0 shadow-sm d-flex align-items-center" role="alert">
              <AlertCircle size={24} className="me-3 text-info" />
              <div className="flex-grow-1">
                <strong>📋 Datos pendientes encontrados:</strong>
                <p className="mb-0 mt-1">{draftSummary}</p>
              </div>
              <div className="ms-3">
                <button className="btn btn-info me-2" onClick={recoverDraft}>
                  Recuperar
                </button>
                <button className="btn btn-outline-secondary" onClick={discardDraft}>
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de Caja Súper Compacto */}
      <div className="row mb-2">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center bg-light rounded p-2 shadow-sm">
            <div className="d-flex align-items-center">
              <span className="badge bg-success me-2">💰</span>
              <small className="fw-bold">Tickets Hoy: {recentTickets.length}</small>
            </div>
            <div className="d-flex align-items-center">
              <small className="text-muted me-2">Total:</small>
              <strong className="text-primary">${recentTickets.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}</strong>
            </div>
            {cashSession && (
              <div className="d-flex align-items-center">
                <span className="badge bg-success">✓ Caja Activa</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        {/* COLUMNA IZQUIERDA - Búsqueda y Productos */}
        <div className="col-lg-5">
          {/* Búsqueda de Productos */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body py-3">
              <div className="row align-items-center">
                <div className="col-md-9">
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-primary text-white border-0">
                      <Search size={24} />
                    </span>
                    <input
                      type="text"
                      className="form-control border-0"
                      placeholder="🔍 Buscar productos por nombre, marca o color..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ fontSize: '18px', fontWeight: '500' }}
                    />
                  </div>
                </div>
                <div className="col-md-3 text-end">
                  <div className="d-flex align-items-center justify-content-end">
                    <span className="badge bg-info fs-6 me-2">{products.filter(p => p.stock > 0).length} productos</span>
                    {salesItems.length > 0 && (
                      <span className="badge bg-success fs-6">Auto-guardado ✓</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Productos Disponibles */}
          {filteredProducts.length > 0 && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-light border-0 py-2">
                <h6 className="mb-0 text-primary">📦 Productos Disponibles ({filteredProducts.length})</h6>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {filteredProducts.slice(0, 20).map(product => (
                    <button
                      key={product.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                      onClick={() => addProductToSale(product)}
                    >
                      <div className="me-3 text-start">
                        <div className="fw-bold" style={{ fontSize: '15px' }}>
                          {product.name}
                        </div>
                        <small className="text-muted">
                          <strong>{product.brand}</strong>
                          {product.color && <span className="ms-1">• {product.color}</span>}
                        </small>
                      </div>
                      <div className="text-end" style={{ minWidth: '140px' }}>
                        <div className="text-success fw-bold">${product.price.toLocaleString()}</div>
                        <span className={`badge ${product.stock > 5 ? 'bg-success' :
                            product.stock > 2 ? 'bg-warning text-dark' : 'bg-danger'
                          }`}>
                          {product.stock} unid.
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* COLUMNA CENTRO - Carrito */}
        <div className="col-lg-5">
          {/* Carrito de Compras */}
          {salesItems.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-success text-white border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <ShoppingCart size={20} className="me-2" />
                    Carrito de Compras ({salesItems.length} productos)
                  </h5>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={clearSale}
                  >
                    <Trash2 size={16} />
                    Limpiar Todo
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0">Producto</th>
                        <th className="border-0 text-center">Cantidad</th>
                        <th className="border-0">Precio Unit.</th>
                        <th className="border-0 text-center">2x1</th>
                        <th className="border-0 text-end">Subtotal</th>
                        <th className="border-0 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesItems.map((item, index) => (
                        <tr key={index}>
                          <td className="py-3">
                            <div>
                              <strong className="text-dark">{item.product.name}</strong>
                              <br />
                              <small className="text-muted">{item.product.brand} {item.product.color && `• ${item.product.color}`}</small>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <button
                                className="btn btn-outline-secondary btn-sm me-2"
                                onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="fw-bold mx-2" style={{ minWidth: '30px', textAlign: 'center' }}>
                                {item.quantity}
                              </span>
                              <button
                                className="btn btn-outline-secondary btn-sm ms-2"
                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="py-3">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              style={{ width: '100px' }}
                              value={item.unitPrice}
                              min="0"
                              step="100"
                              onChange={(e) => handlePriceChange(index, parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-3 text-center">
                            <div className="form-check d-flex justify-content-center">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={item.applyPromotion}
                                onChange={(e) => handlePromotionChange(index, e.target.checked)}
                              />
                            </div>
                          </td>
                          <td className="py-3 text-end">
                            <strong className="text-success fs-6">${calculateItemSubtotal(item).toLocaleString()}</strong>
                          </td>
                          <td className="py-3 text-center">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeProductFromSale(index)}
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total del Carrito */}
                <div className="p-4 bg-light border-top">
                  <div className="row">
                    <div className="col-md-6 offset-md-6">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between mb-2">
                            <span>Subtotal:</span>
                            <span className="fw-bold">${calculateSubtotal().toLocaleString()}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-success">Descuento 2x1:</span>
                            <span className="text-success fw-bold">-${calculatePromotionDiscount().toLocaleString()}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between">
                            <strong className="fs-5">TOTAL:</strong>
                            <strong className="text-primary fs-4">${calculateTotal().toLocaleString()}</strong>
                          </div>
                          {/* Split de Pagos a nivel Ticket */}
                          <div className="mt-3 p-2 border rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <strong>Pagos</strong>
                              <small className={paymentsTotal === totalAmount() ? 'text-success' : 'text-danger'}>
                                Asignado: ${paymentsTotal.toLocaleString()} / ${totalAmount().toLocaleString()}
                              </small>
                            </div>
                            {payments.map((p, idx) => (
                              <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                                <select
                                  className="form-select form-select-sm"
                                  style={{ maxWidth: 160 }}
                                  value={p.method}
                                  onChange={(e) => updatePaymentMethod(idx, e.target.value as PaymentMethod)}
                                >
                                  <option value="cash">💵 Efectivo</option>
                                  <option value="card">💳 Tarjeta</option>
                                  <option value="qr">📱 QR</option>
                                  <option value="transfer">🏦 Transferencia</option>
                                </select>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  style={{ maxWidth: 140 }}
                                  value={p.amount}
                                  min={0}
                                  step={100}
                                  onChange={(e) => updatePaymentAmount(idx, parseInt(e.target.value) || 0)}
                                />
                                {payments.length > 1 && (
                                  <button className="btn btn-outline-danger btn-sm" onClick={() => removePaymentLine(idx)}>
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="d-flex gap-2 mt-2">
                              <button className="btn btn-outline-success btn-sm" onClick={() => addPaymentLine('cash')}>+ Efectivo</button>
                              <button className="btn btn-outline-primary btn-sm" onClick={() => addPaymentLine('card')}>+ Tarjeta</button>
                              <button className="btn btn-outline-dark btn-sm" onClick={() => addPaymentLine('transfer')}>+ Transferencia</button>
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => addPaymentLine('qr')}>+ QR</button>
                            </div>
                            {paymentsTotal !== totalAmount() && (
                              <div className="mt-2 text-danger small">La suma de los pagos debe coincidir con el total.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {error && (
            <div className="alert alert-danger mt-3 border-0 shadow-sm">
              <AlertCircle size={20} className="me-2" />
              {error}
            </div>
          )}

        </div>

        {/* COLUMNA DERECHA - Cliente, Ventas Recientes y Acciones */}
        <div className="col-lg-2">
          {/* Panel de Cliente Compacto */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-info text-white border-0 py-2">
              <h6 className="mb-0 d-flex align-items-center justify-content-between">
                <span>
                  <User size={16} className="me-2" />
                  👤 Cliente
                </span>
                {selectedCustomer && (
                  <button
                    className="btn btn-sm btn-outline-light"
                    onClick={() => setSelectedCustomer(null)}
                    style={{ padding: '2px 8px' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </h6>
            </div>
            <div className="card-body py-2">
              {selectedCustomer ? (
                <div>
                  <div className="mb-1">
                    <strong style={{ fontSize: '14px' }}>{selectedCustomer.name}</strong>
                  </div>
                  <small className="text-muted d-block">
                    {selectedCustomer.cuit_dni}
                    {selectedCustomer.address && ` • ${selectedCustomer.address}`}
                  </small>
                </div>
              ) : (
                <div className="text-center py-2">
                  <button
                    className="btn btn-info w-100"
                    onClick={() => setShowCustomerForm(true)}
                    style={{ fontSize: '14px' }}
                  >
                    <User size={16} className="me-2" />
                    Agregar Cliente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tickets Recientes Compactos */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-secondary text-white border-0 py-2">
              <h6 className="mb-0" style={{ fontSize: '14px' }}>
                <FileText size={14} className="me-2" />
                📈 Hoy: {recentTickets.length} tickets - ${recentTickets.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}
              </h6>
            </div>
            <div className="card-body p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {recentTickets.length === 0 ? (
                <div className="text-center py-2">
                  <small className="text-muted">No hay ventas registradas</small>
                </div>
              ) : (
                recentTickets.slice(0, 5).map(ticket => (
                  <div key={ticket.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div className="d-flex align-items-center">
                      <div>
                        <strong className="text-success" style={{ fontSize: '13px' }}>
                          ${ticket.total_amount.toLocaleString()}
                        </strong>
                        <span className="ms-2" style={{ fontSize: '12px' }}>
                          🧾
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <small className="text-muted me-2" style={{ fontSize: '11px' }}>
                        {new Date(ticket.created_at).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </small>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={async () => {
                          try {
                            const detail = await getTicketWithItems(ticket.id);
                            const defaultCustomer = await getDefaultCustomer();
                            const td: TicketData = {
                              ticket_number: detail.ticket.ticket_number,
                              customer: (detail.ticket.customer as any) || defaultCustomer,
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
                              subtotal: detail.ticket.subtotal,
                              iva_amount: detail.ticket.iva_amount,
                              total: detail.ticket.total_amount,
                              payment_method: detail.ticket.payment_method,
                              created_at: detail.ticket.created_at,
                              vendor_name: (detail.ticket.cash_session as any)?.vendor?.name || 'Vendedor',
                            };
                            setTicketData(td);
                            setShowTicket(true);
                          } catch (error) {
                            console.error('Error al cargar ticket:', error);
                            alert('Error al cargar el ticket');
                          }
                        }}
                        title="Imprimir ticket"
                      >
                        🗺️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Acciones de Venta */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body p-2">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary"
                  onClick={handleProcessSale}
                  disabled={isLoading || salesItems.length === 0}
                  title={salesItems.length === 0 ? 'Agrega productos al carrito' : 'Registrar la venta'}
                >
                  {isLoading ? 'Procesando…' : `Registrar Venta (${calculateTotal().toLocaleString()})`}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={clearSale}
                  disabled={isLoading || salesItems.length === 0}
                >
                  Vaciar Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cliente */}
      {showCustomerForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">👤 Agregar Cliente</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCustomerForm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <CustomerForm
                  onCustomerSelected={(customer: Customer) => {
                    setSelectedCustomer(customer);
                    setShowCustomerForm(false);
                  }}
                  onClose={() => setShowCustomerForm(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer lateral de Ticket (Offcanvas) */}
      {showTicket && ticketData && (
        <>
          {/* Backdrop */}
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => setShowTicket(false)}
            style={{ zIndex: 1040 }}
          />
          {/* Panel derecho */}
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{ visibility: 'visible', width: '520px', zIndex: 1045 }}
            aria-modal="true" role="dialog"
          >
            <div className="offcanvas-header">
              <h5 className="offcanvas-title">🧾 Ticket de Venta</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowTicket(false)} />
            </div>
            <div className="offcanvas-body">
              <TicketPrint
                ticketData={ticketData}
                onClose={() => setShowTicket(false)}
                onPrint={() => window.print()}
              />
            </div>
            <div className="border-top p-3 d-flex justify-content-end">
              <button className="btn btn-secondary" onClick={() => setShowTicket(false)}>Cerrar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesWorkspace;
