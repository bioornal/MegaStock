"use client";

import { useState, useEffect } from 'react';
import { CashSession, registerSale, getSalesBySession, Sale } from '@/services/vendorService';
import { getProducts, Product } from '@/services/productService';
import { Customer, getTicketData } from '@/services/customerService';
import { ShoppingCart, Plus, Trash2, CreditCard, Smartphone, DollarSign, Search, Save, AlertCircle, User, FileText, Minus, X, Package, Users, Receipt } from 'lucide-react';
import { useDebounce } from '@/lib/hooks';
import { salesPersistence } from '@/lib/salesPersistence';
import CustomerForm from './CustomerForm';
import TicketPrint from './TicketPrint';

interface SalesFormProps {
  cashSession: CashSession;
  onSaleRegistered: () => void;
}

interface SaleItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  paymentMethod: 'cash' | 'card' | 'qr' | 'transfer';
  applyPromotion: boolean;
}

const ImprovedSalesForm = ({ cashSession, onSaleRegistered }: SalesFormProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [salesItems, setSalesItems] = useState<SaleItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, salesData] = await Promise.all([
          getProducts(),
          getSalesBySession(cashSession.id)
        ]);
        setProducts(productsData);
        setRecentSales(salesData);
        
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
    const filtered = availableProducts.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.brand.toLowerCase().includes(searchLower) ||
      (product.color && product.color.toLowerCase().includes(searchLower))
    );
    setFilteredProducts(filtered);
  }, [debouncedSearchTerm, products]);

  // Auto-guardar draft cuando cambian los items
  useEffect(() => {
    if (salesItems.length > 0) {
      const draftItems = salesItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        paymentMethod: item.paymentMethod,
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
        paymentMethod: 'cash',
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

  const handlePaymentMethodChange = (index: number, method: 'cash' | 'card' | 'qr' | 'transfer') => {
    const newItems = [...salesItems];
    newItems[index].paymentMethod = method;
    setSalesItems(newItems);
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

  const calculateItemSubtotal = (item: SaleItem): number => {
    const baseSubtotal = item.quantity * item.unitPrice;
    if (item.applyPromotion && item.quantity >= 2) {
      const freeItems = Math.floor(item.quantity / 2);
      return baseSubtotal - (freeItems * item.unitPrice);
    }
    return baseSubtotal;
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
      // Procesar cada item como una venta individual (según la estructura actual)
      const salePromises = salesItems.map(item => {
        const itemSubtotal = calculateItemSubtotal(item);
        return registerSale({
          cash_session_id: cashSession.id,
          customer_id: selectedCustomer?.id || null,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: itemSubtotal,
          payment_method: item.paymentMethod
        });
      });

      const sales = await Promise.all(salePromises);
      
      // Generar datos del ticket si hay cliente
      if (selectedCustomer && sales.length > 0) {
        const saleIds = sales.map(sale => sale.id);
        const ticketInfo = await getTicketData(saleIds);
        setTicketData(ticketInfo);
        setShowTicket(true);
      }

      // Limpiar formulario
      clearSale();
      onSaleRegistered();

      // Actualizar ventas recientes
      const updatedSales = await getSalesBySession(cashSession.id);
      setRecentSales(updatedSales);

    } catch (error: any) {
      setError(error.message || 'Error al procesar la venta');
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
              <small className="fw-bold">Ventas Hoy: {recentSales.length}</small>
            </div>
            <div className="d-flex align-items-center">
              <small className="text-muted me-2">Total:</small>
              <strong className="text-primary">${recentSales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString()}</strong>
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
        {/* COLUMNA IZQUIERDA - Productos y Carrito */}
        <div className="col-lg-8">
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

          {/* Grid de Productos Disponibles */}
          {filteredProducts.length > 0 && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-light border-0 py-2">
                <h6 className="mb-0 text-primary">📦 Productos Disponibles ({filteredProducts.length})</h6>
              </div>
              <div className="card-body p-3">
                <div className="row g-2">
                  {filteredProducts.slice(0, 8).map(product => (
                    <div key={product.id} className="col-md-6 col-lg-3">
                      <div 
                        className="card h-100 border-0 shadow-sm product-card" 
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderLeft: `5px solid ${
                            product.stock > 5 ? '#28a745' : 
                            product.stock > 2 ? '#ffc107' : '#dc3545'
                          }`,
                          minHeight: '120px'
                        }}
                        onClick={() => addProductToSale(product)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                        }}
                      >
                        <div className="card-body p-3 d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <h6 className="card-title mb-1 fw-bold" style={{ fontSize: '15px', lineHeight: '1.2' }}>
                                {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                              </h6>
                              <p className="card-text text-muted mb-2" style={{ fontSize: '13px' }}>
                                <strong>{product.brand}</strong>
                                {product.color && <span className="ms-1">• {product.color}</span>}
                              </p>
                            </div>
                            <div className="text-center ms-2">
                              <Plus size={24} className="text-primary" style={{ 
                                backgroundColor: '#e3f2fd', 
                                borderRadius: '50%', 
                                padding: '4px'
                              }} />
                            </div>
                          </div>
                          <div className="mt-auto">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-success fw-bold" style={{ fontSize: '16px' }}>
                                ${product.price.toLocaleString()}
                              </span>
                              <span className={`badge ${
                                product.stock > 5 ? 'bg-success' : 
                                product.stock > 2 ? 'bg-warning text-dark' : 'bg-danger'
                              }`} style={{ fontSize: '11px' }}>
                                {product.stock} unid.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                    <Trash2 size={16} className="me-1" />
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
                        <th className="border-0">Pago</th>
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
                              <br/>
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
                          <td className="py-3">
                            <select
                              className="form-select form-select-sm"
                              value={item.paymentMethod}
                              onChange={(e) => handlePaymentMethodChange(index, e.target.value as any)}
                            >
                              <option value="cash">💵 Efectivo</option>
                              <option value="card">💳 Tarjeta</option>
                              <option value="qr">📱 QR</option>
                              <option value="transfer">🏦 Transferencia</option>
                            </select>
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
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          {salesItems.length > 0 && (
            <div className="mt-4">
              <div className="row g-3">
                <div className="col-md-8">
                  <button
                    className="btn btn-success btn-lg w-100"
                    onClick={handleProcessSale}
                    disabled={isLoading}
                    style={{ height: '60px', fontSize: '18px' }}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Procesando venta...
                      </>
                    ) : (
                      <>
                        <Receipt size={24} className="me-2" />
                        💰 PROCESAR VENTA - ${calculateTotal().toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
                <div className="col-md-4">
                  <button
                    className="btn btn-info btn-lg w-100"
                    onClick={() => {
                      if (selectedCustomer && salesItems.length > 0) {
                        // Simular datos del ticket para vista previa
                        const mockTicketData = {
                          ticket_number: `PREV-${Date.now()}`,
                          customer: selectedCustomer,
                          sale_items: salesItems.map(item => ({
                            product_name: item.product.name,
                            brand: item.product.brand,
                            quantity: item.quantity,
                            unit_price: item.unitPrice,
                            total_amount: calculateItemSubtotal(item),
                            unit_price_without_iva: Math.round(item.unitPrice / 1.21),
                            subtotal_without_iva: Math.round(calculateItemSubtotal(item) / 1.21)
                          })),
                          subtotal: calculateSubtotal(),
                          discount: calculatePromotionDiscount(),
                          total: calculateTotal(),
                          iva_amount: Math.round(calculateTotal() - (calculateTotal() / 1.21)),
                          total_without_iva: Math.round(calculateTotal() / 1.21),
                          vendor_name: cashSession.vendor?.name || 'Vendedor',
                          sale_date: new Date().toISOString()
                        };
                        setTicketData(mockTicketData);
                        setShowTicket(true);
                      } else {
                        alert('Debe agregar productos y seleccionar un cliente para ver el ticket');
                      }
                    }}
                    style={{ height: '60px', fontSize: '16px' }}
                  >
                    <FileText size={20} className="me-2" />
                    🗺️ Vista Previa
                  </button>
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

        {/* COLUMNA DERECHA - Cliente y Ventas Recientes */}
        <div className="col-lg-4">
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

          {/* Ventas Recientes Compactas */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-secondary text-white border-0 py-2">
              <h6 className="mb-0" style={{ fontSize: '14px' }}>
                <FileText size={14} className="me-2" />
                📈 Hoy: {recentSales.length} ventas - ${recentSales.reduce((sum, sale) => sum + sale.total_amount, 0).toLocaleString()}
              </h6>
            </div>
            <div className="card-body p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {recentSales.length === 0 ? (
                <div className="text-center py-2">
                  <small className="text-muted">No hay ventas registradas</small>
                </div>
              ) : (
                recentSales.slice(0, 5).map(sale => (
                  <div key={sale.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div className="d-flex align-items-center">
                      <div>
                        <strong className="text-success" style={{ fontSize: '13px' }}>
                          ${sale.total_amount.toLocaleString()}
                        </strong>
                        <span className="ms-2" style={{ fontSize: '12px' }}>
                          {sale.payment_method === 'cash' ? '💵' : 
                           sale.payment_method === 'card' ? '💳' : 
                           sale.payment_method === 'qr' ? '📱' : '🏦'}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <small className="text-muted me-2" style={{ fontSize: '11px' }}>
                        {new Date(sale.created_at).toLocaleTimeString('es-CL', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </small>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={async () => {
                          try {
                            const ticketInfo = await getTicketData([sale.id]);
                            setTicketData(ticketInfo);
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

      {/* Modal de Ticket */}
      {showTicket && ticketData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🧾 Ticket de Venta</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTicket(false)}
                ></button>
              </div>
              <div className="modal-body">
                <TicketPrint 
                  ticketData={ticketData} 
                  onClose={() => setShowTicket(false)}
                  onPrint={() => window.print()}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowTicket(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedSalesForm;
