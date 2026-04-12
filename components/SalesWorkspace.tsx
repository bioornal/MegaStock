"use client";

import { useState, useEffect, useCallback } from 'react';
import { CashSession, Ticket, getTicketsBySession, createTicketWithItems, getTicketWithItems } from '@/services/vendorService';
import { getProducts, Product } from '@/services/productService';
import { Customer, getDefaultCustomer, TicketData } from '@/services/customerService';
import { ShoppingCart, Plus, Trash2, Search, AlertCircle, User, Minus, X, Receipt } from 'lucide-react';
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

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Efectivo', icon: '$' },
  { key: 'card', label: 'Tarjeta', icon: '~' },
  { key: 'qr', label: 'QR', icon: '#' },
  { key: 'transfer', label: 'Transfer', icon: '>' },
];

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
    // Clear search after adding
    setSearchTerm('');
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

  function calculateItemSubtotal(item: SaleItem): number {
    const baseSubtotal = item.quantity * item.unitPrice;
    if (item.applyPromotion && item.quantity >= 2) {
      const freeItems = Math.floor(item.quantity / 2);
      return baseSubtotal - (freeItems * item.unitPrice);
    }
    return baseSubtotal;
  }

  const totalAmount = useCallback((): number => salesItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0), [salesItems]);
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const setSinglePaymentCoveringTotal = () => {
    setPayments([{ method: 'cash', amount: totalAmount() }]);
  };

  useEffect(() => {
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
          throw new Error('Metodo de pago invalido.');
        }
        if (p.amount < 0) {
          throw new Error('Los montos de pago no pueden ser negativos.');
        }
      }

      const itemsPayload = salesItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: calculateItemSubtotal(item),
      }));

      const result = await createTicketWithItems({
        cash_session_id: cashSession.id,
        customer_id: selectedCustomer?.id || null,
        items: itemsPayload,
        payments: payments.map(p => ({ payment_method: p.method, amount: p.amount })) as any,
      });

      const detail = await getTicketWithItems(result.ticket.id);
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

      clearSale();
      onSaleRegistered();

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

  const discount = calculatePromotionDiscount();

  return (
    <div className="ms-animate-in">
      {/* Draft notification */}
      {hasPendingDraft && (
        <div
          className="mb-3"
          style={{
            background: 'var(--ms-blue-dim)',
            border: '1px solid rgba(116, 185, 255, 0.2)',
            borderRadius: 'var(--ms-radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={18} style={{ color: 'var(--ms-blue)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--ms-blue)' }}>
            <strong>Venta pendiente:</strong> {draftSummary}
          </div>
          <button className="btn btn-sm" onClick={recoverDraft} style={{ background: 'var(--ms-blue)', color: '#fff', fontSize: '0.8rem' }}>
            Recuperar
          </button>
          <button className="btn btn-sm" onClick={discardDraft} style={{ background: 'var(--ms-bg-surface)', color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
            Descartar
          </button>
        </div>
      )}

      <div className="row g-3">
        {/* ═══════════ LEFT COLUMN — Search + Products ═══════════ */}
        <div className="col-lg-6">
          {/* Search bar */}
          <div
            style={{
              background: 'var(--ms-bg-raised)',
              border: '1px solid var(--ms-border)',
              borderRadius: 'var(--ms-radius-md)',
              padding: '0.75rem',
              marginBottom: '0.75rem'
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <Search size={20} style={{ color: 'var(--ms-accent)', flexShrink: 0 }} />
              <input
                type="text"
                className="form-control border-0"
                placeholder="Buscar producto por nombre, marca o color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  background: 'transparent',
                  color: 'var(--ms-text-primary)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  padding: '0.4rem 0.5rem',
                  boxShadow: 'none'
                }}
              />
              <span
                style={{
                  color: 'var(--ms-text-muted)',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  background: 'var(--ms-bg-surface)',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--ms-radius-sm)'
                }}
              >
                {products.filter(p => p.stock > 0).length} productos
              </span>
            </div>
          </div>

          {/* Product results */}
          {filteredProducts.length > 0 && (
            <div
              style={{
                background: 'var(--ms-bg-raised)',
                border: '1px solid var(--ms-border)',
                borderRadius: 'var(--ms-radius-md)',
                maxHeight: '65vh',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--ms-border)',
                  color: 'var(--ms-text-muted)',
                  fontSize: '0.75rem',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {filteredProducts.length} resultados
              </div>
              {filteredProducts.slice(0, 30).map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProductToSale(product)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: 'none',
                    borderBottom: '1px solid var(--ms-border)',
                    background: 'transparent',
                    color: 'var(--ms-text-primary)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ms-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3 }}>
                      {product.name}
                    </div>
                    <div style={{ color: 'var(--ms-text-muted)', fontSize: '0.78rem' }}>
                      {product.brand}
                      {product.color && <span> / {product.color}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: 'var(--ms-green)', fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem' }}>
                      ${product.price.toLocaleString()}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: product.stock > 5 ? 'var(--ms-green-dim)' : product.stock > 2 ? 'var(--ms-amber-dim)' : 'var(--ms-red-dim)',
                        color: product.stock > 5 ? 'var(--ms-green)' : product.stock > 2 ? 'var(--ms-amber)' : 'var(--ms-red)',
                      }}
                    >
                      {product.stock} u.
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent tickets panel (when no search active) */}
          {!debouncedSearchTerm.trim() && recentTickets.length > 0 && (
            <div
              style={{
                background: 'var(--ms-bg-raised)',
                border: '1px solid var(--ms-border)',
                borderRadius: 'var(--ms-radius-md)',
                marginTop: '0.75rem'
              }}
            >
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--ms-border)',
                  color: 'var(--ms-text-muted)',
                  fontSize: '0.75rem',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Tickets recientes</span>
                <span style={{ color: 'var(--ms-green)', fontWeight: 600 }}>
                  ${recentTickets.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}
                </span>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {recentTickets.slice(0, 8).map(ticket => (
                  <div
                    key={ticket.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.45rem 0.75rem',
                      borderBottom: '1px solid var(--ms-border)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={12} style={{ color: 'var(--ms-text-muted)' }} />
                      <span style={{ color: 'var(--ms-green)', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                        ${ticket.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.75rem' }}>
                        {new Date(ticket.created_at).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.7rem',
                          background: 'var(--ms-accent-dim)',
                          color: 'var(--ms-accent-light)',
                          border: '1px solid var(--ms-border-accent)',
                          borderRadius: '4px'
                        }}
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
                          }
                        }}
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT COLUMN — Cart + Checkout ═══════════ */}
        <div className="col-lg-6">
          {salesItems.length === 0 ? (
            /* Empty state */
            <div
              style={{
                background: 'var(--ms-bg-raised)',
                border: '1px solid var(--ms-border)',
                borderRadius: 'var(--ms-radius-md)',
                padding: '3rem',
                textAlign: 'center'
              }}
            >
              <ShoppingCart size={40} style={{ color: 'var(--ms-text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--ms-text-muted)', fontFamily: 'Outfit, sans-serif', fontSize: '1rem', margin: 0 }}>
                Busca y agrega productos para iniciar una venta
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--ms-bg-raised)',
                border: '1px solid var(--ms-border)',
                borderRadius: 'var(--ms-radius-md)',
                overflow: 'hidden'
              }}
            >
              {/* Cart header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  borderBottom: '1px solid var(--ms-border)',
                  background: 'var(--ms-bg-surface)'
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <ShoppingCart size={16} style={{ color: 'var(--ms-accent-light)' }} />
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--ms-text-primary)'
                  }}>
                    Carrito ({salesItems.length})
                  </span>
                  {salesItems.length > 0 && (
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'var(--ms-green)',
                      background: 'var(--ms-green-dim)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      Auto-guardado
                    </span>
                  )}
                </div>
                <button
                  onClick={clearSale}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ms-text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Trash2 size={12} /> Vaciar
                </button>
              </div>

              {/* Cart items */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {salesItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      borderBottom: '1px solid var(--ms-border)',
                      gap: '0.5rem'
                    }}
                  >
                    {/* Product info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
                        {item.product.name}
                      </div>
                      <div style={{ color: 'var(--ms-text-muted)', fontSize: '0.72rem' }}>
                        {item.product.brand}
                        {item.product.color && ` / ${item.product.color}`}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="d-flex align-items-center gap-1">
                      <button
                        className="btn btn-sm"
                        onClick={() => handleQuantityChange(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{
                          width: 26, height: 26, padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--ms-bg-surface)',
                          border: '1px solid var(--ms-border)',
                          color: 'var(--ms-text-secondary)',
                          borderRadius: '4px'
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{
                        minWidth: 28, textAlign: 'center',
                        fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                        fontSize: '0.9rem'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        style={{
                          width: 26, height: 26, padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--ms-bg-surface)',
                          border: '1px solid var(--ms-border)',
                          color: 'var(--ms-text-secondary)',
                          borderRadius: '4px'
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Price input */}
                    <input
                      type="number"
                      value={item.unitPrice}
                      min="0"
                      step="100"
                      onChange={(e) => handlePriceChange(index, parseInt(e.target.value) || 0)}
                      style={{
                        width: 80,
                        background: 'var(--ms-bg-surface)',
                        border: '1px solid var(--ms-border)',
                        color: 'var(--ms-text-primary)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.8rem',
                        textAlign: 'right'
                      }}
                    />

                    {/* 2x1 toggle */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        color: item.applyPromotion ? 'var(--ms-green)' : 'var(--ms-text-muted)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={item.applyPromotion}
                        onChange={(e) => handlePromotionChange(index, e.target.checked)}
                        style={{ width: 14, height: 14, margin: 0 }}
                      />
                      2x1
                    </label>

                    {/* Subtotal */}
                    <div style={{
                      minWidth: 72, textAlign: 'right',
                      fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                      fontSize: '0.9rem', color: 'var(--ms-green)'
                    }}>
                      ${calculateItemSubtotal(item).toLocaleString()}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeProductFromSale(index)}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--ms-text-muted)', cursor: 'pointer',
                        padding: '0.2rem', borderRadius: '4px',
                        display: 'flex', alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ms-red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ms-text-muted)'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--ms-border)', background: 'var(--ms-bg-surface)' }}>
                <div className="d-flex justify-content-between" style={{ fontSize: '0.82rem', color: 'var(--ms-text-muted)', marginBottom: '0.25rem' }}>
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="d-flex justify-content-between" style={{ fontSize: '0.82rem', color: 'var(--ms-green)', marginBottom: '0.25rem' }}>
                    <span>Descuento 2x1</span>
                    <span>-${discount.toLocaleString()}</span>
                  </div>
                )}
                <div
                  className="d-flex justify-content-between align-items-center"
                  style={{
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem',
                    borderTop: '1px solid var(--ms-border)'
                  }}
                >
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>TOTAL</span>
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 800,
                    fontSize: '1.6rem',
                    color: 'var(--ms-green)',
                    letterSpacing: '-0.03em'
                  }}>
                    ${calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment method */}
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--ms-border)' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span style={{ fontSize: '0.75rem', fontFamily: 'Outfit, sans-serif', fontWeight: 500, color: 'var(--ms-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Metodo de pago
                  </span>
                  {payments.length === 1 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--ms-text-muted)' }}>
                      Toca para dividir pago
                    </span>
                  )}
                </div>

                {payments.length === 1 ? (
                  /* Single payment - simple button group */
                  <div className="d-flex gap-2 mb-2">
                    {PAYMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => updatePaymentMethod(0, opt.key)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.25rem',
                          borderRadius: 'var(--ms-radius-sm)',
                          border: payments[0].method === opt.key ? '2px solid var(--ms-accent)' : '1px solid var(--ms-border)',
                          background: payments[0].method === opt.key ? 'var(--ms-accent-dim)' : 'var(--ms-bg-surface)',
                          color: payments[0].method === opt.key ? 'var(--ms-accent-light)' : 'var(--ms-text-muted)',
                          cursor: 'pointer',
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          transition: 'all 0.15s ease',
                          textAlign: 'center'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Multiple payments */
                  <div className="mb-2">
                    {payments.map((p, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-2 mb-2">
                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: 140, background: 'var(--ms-bg-surface)', border: '1px solid var(--ms-border)', color: 'var(--ms-text-primary)', fontSize: '0.8rem' }}
                          value={p.method}
                          onChange={(e) => updatePaymentMethod(idx, e.target.value as PaymentMethod)}
                        >
                          {PAYMENT_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ maxWidth: 120, background: 'var(--ms-bg-surface)', border: '1px solid var(--ms-border)', color: 'var(--ms-text-primary)', fontSize: '0.8rem' }}
                          value={p.amount}
                          min={0}
                          step={100}
                          onChange={(e) => updatePaymentAmount(idx, parseInt(e.target.value) || 0)}
                        />
                        <button
                          className="btn btn-sm"
                          onClick={() => removePaymentLine(idx)}
                          style={{ color: 'var(--ms-red)', background: 'none', border: 'none', padding: '0.2rem' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between" style={{ fontSize: '0.75rem' }}>
                      <span style={{ color: paymentsTotal === totalAmount() ? 'var(--ms-green)' : 'var(--ms-red)' }}>
                        Asignado: ${paymentsTotal.toLocaleString()} / ${totalAmount().toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Split payment toggle */}
                {payments.length === 1 && (
                  <div className="d-flex gap-1 mb-3">
                    {PAYMENT_OPTIONS.filter(o => o.key !== payments[0].method).map(opt => (
                      <button
                        key={opt.key}
                        className="btn btn-sm"
                        onClick={() => addPaymentLine(opt.key)}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          background: 'var(--ms-bg-surface)',
                          color: 'var(--ms-text-muted)',
                          border: '1px solid var(--ms-border)',
                          borderRadius: '4px'
                        }}
                      >
                        + {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {paymentsTotal !== totalAmount() && payments.length > 1 && (
                  <div style={{ color: 'var(--ms-red)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    La suma de los pagos debe coincidir con el total.
                  </div>
                )}

                {/* Customer */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  {selectedCustomer ? (
                    <div
                      className="d-flex align-items-center justify-content-between flex-grow-1"
                      style={{
                        background: 'var(--ms-bg-surface)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--ms-radius-sm)',
                        border: '1px solid var(--ms-border)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{selectedCustomer.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--ms-text-muted)', marginLeft: '0.5rem' }}>
                          {selectedCustomer.cuit_dni}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--ms-text-muted)', cursor: 'pointer', padding: '0.1rem' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm flex-grow-1"
                      onClick={() => setShowCustomerForm(true)}
                      style={{
                        background: 'var(--ms-bg-surface)',
                        border: '1px solid var(--ms-border)',
                        color: 'var(--ms-text-muted)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <User size={14} /> Agregar cliente (opcional)
                    </button>
                  )}
                </div>

                {/* THE BIG SELL BUTTON */}
                <button
                  onClick={handleProcessSale}
                  disabled={isLoading || salesItems.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    borderRadius: 'var(--ms-radius-md)',
                    border: 'none',
                    background: isLoading ? 'var(--ms-bg-overlay)' : 'linear-gradient(135deg, var(--ms-green) 0%, #00b894 100%)',
                    color: isLoading ? 'var(--ms-text-muted)' : 'var(--ms-text-inverse)',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: isLoading ? 'wait' : 'pointer',
                    boxShadow: isLoading ? 'none' : '0 4px 20px rgba(0, 206, 201, 0.3)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {isLoading ? 'Procesando...' : `Registrar Venta  $${calculateTotal().toLocaleString()}`}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              className="mt-2"
              style={{
                background: 'var(--ms-red-dim)',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: 'var(--ms-radius-sm)',
                padding: '0.6rem 0.75rem',
                color: 'var(--ms-red)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog">
            <div className="modal-content" style={{ background: 'var(--ms-bg-raised)', border: '1px solid var(--ms-border)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--ms-border)' }}>
                <h5 className="modal-title" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>Agregar Cliente</h5>
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

      {/* Ticket Drawer */}
      {showTicket && ticketData && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => setShowTicket(false)}
            style={{ zIndex: 1040, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="offcanvas offcanvas-end show"
            tabIndex={-1}
            style={{
              visibility: 'visible',
              width: '520px',
              zIndex: 1045,
              background: 'var(--ms-bg-raised)',
              borderLeft: '1px solid var(--ms-border)'
            }}
            aria-modal="true" role="dialog"
          >
            <div className="offcanvas-header" style={{ borderBottom: '1px solid var(--ms-border)' }}>
              <h5 className="offcanvas-title" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
                Ticket de Venta
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowTicket(false)} />
            </div>
            <div className="offcanvas-body">
              <TicketPrint
                ticketData={ticketData}
                onClose={() => setShowTicket(false)}
                onPrint={() => window.print()}
              />
            </div>
            <div style={{ borderTop: '1px solid var(--ms-border)', padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setShowTicket(false)}
                style={{
                  background: 'var(--ms-bg-surface)',
                  border: '1px solid var(--ms-border)',
                  color: 'var(--ms-text-secondary)',
                  fontSize: '0.85rem'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesWorkspace;
