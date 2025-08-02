"use client";

import { useState, useEffect } from 'react';
import { CashSession, registerSale, getSalesBySession, Sale } from '@/services/vendorService';
import { getProducts, Product } from '@/services/productService';
import { Customer, getTicketData } from '@/services/customerService';
import { ShoppingCart, Plus, Trash2, CreditCard, Smartphone, DollarSign, Search, Save, AlertCircle, User, FileText } from 'lucide-react';
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
  unitPrice: number; // Precio unitario editable
  paymentMethod: 'cash' | 'card' | 'qr' | 'transfer';
  applyPromotion: boolean; // Checkbox para promo 2x1
}

const SalesForm = ({ cashSession, onSaleRegistered }: SalesFormProps) => {
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

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = salesItems.map((it, i) => {
        if (i === index) {
            const updatedItem = { ...it, quantity };
            if (quantity < 2) {
                updatedItem.applyPromotion = false;
            }
            return updatedItem;
        }
        return it;
    });
    setSalesItems(updatedItems);
  };

  const addSaleItem = (product: Product) => {
    const existingIndex = salesItems.findIndex(item => item.product.id === product.id);

    if (existingIndex >= 0) {
      const item = salesItems[existingIndex];
      if (item.quantity < item.product.stock) {
        handleQuantityChange(existingIndex, item.quantity + 1);
      }
    } else {
      if (product.stock > 0) {
        setSalesItems([...salesItems, {
          product,
          quantity: 1,
          unitPrice: product.price,
          paymentMethod: 'cash',
          applyPromotion: false
        }]);
      }
    }
    setSearchTerm('');
  };

  // Recuperar draft pendiente
  const loadPendingDraft = async () => {
    try {
      const draftItems = salesPersistence.loadDraft(cashSession.vendor_id, cashSession.id);
      if (draftItems.length === 0) return;

      // Convertir draft items a SaleItem format
      const recoveredItems: SaleItem[] = [];
      
      for (const draftItem of draftItems) {
        const product = products.find(p => p.id === draftItem.productId);
        if (product && product.stock >= draftItem.quantity) {
          recoveredItems.push({
            product,
            quantity: draftItem.quantity,
            unitPrice: product.price, // Usar precio actual del producto
            paymentMethod: draftItem.paymentMethod,
            applyPromotion: false
          });
        }
      }

      setSalesItems(recoveredItems);
      setHasPendingDraft(false);
      setDraftSummary('');
      
      console.log('✅ Draft recuperado:', recoveredItems.length, 'items');
    } catch (error) {
      console.error('Error recuperando draft:', error);
    }
  };

  // Descartar draft pendiente
  const discardPendingDraft = () => {
    salesPersistence.clearDraft(cashSession.vendor_id, cashSession.id);
    setHasPendingDraft(false);
    setDraftSummary('');
    console.log('🗑️ Draft descartado por el usuario');
  };

  const removeSaleItem = (index: number) => {
    const updated = salesItems.filter((_, i) => i !== index);
    setSalesItems(updated);
  };

  const updateSaleItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = salesItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };

        // Si la cantidad es menor a 2, desactivar la promoción automáticamente
        if (field === 'quantity' && updatedItem.quantity < 2) {
          updatedItem.applyPromotion = false;
        }
        
        return updatedItem;
      }
      return item;
    });
    setSalesItems(updatedItems);
  };

  const calculateTotal = () => {
    return salesItems.reduce((total, item) => {
      let itemTotal = item.unitPrice * item.quantity;
      if (item.applyPromotion && item.quantity >= 2) {
        itemTotal -= item.unitPrice; // Descontar el valor de una unidad
      }
      return total + itemTotal;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (salesItems.length === 0) {
      setError('Agrega al menos un producto para registrar la venta');
      return;
    }

    // Validar stock disponible
    for (const item of salesItems) {
      if (item.quantity > item.product.stock) {
        setError(`Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`);
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      const saleIds: number[] = [];
      
      // Registrar cada item como una venta separada
      for (const item of salesItems) {
        const saleResult = await registerSale({
          cash_session_id: cashSession.id,
          customer_id: selectedCustomer?.id || null,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.applyPromotion && item.quantity >= 2
            ? item.unitPrice * (item.quantity - 1)
            : item.unitPrice * item.quantity,
          payment_method: item.paymentMethod
        });
        
        if (saleResult?.id) {
          saleIds.push(saleResult.id);
        }
      }

      // Ya no generamos ticket automáticamente, se hará desde ventas recientes

      // Limpiar draft después de guardar exitosamente
      salesPersistence.clearDraft(cashSession.vendor_id, cashSession.id);
      
      // Limpiar formulario y actualizar datos
      setSalesItems([]);
      setSelectedCustomer(null);
      onSaleRegistered();
      
      // Actualizar ventas recientes
      const updatedSales = await getSalesBySession(cashSession.id);
      setRecentSales(updatedSales);
      
      // Actualizar productos disponibles
      const updatedProducts = await getProducts();
      const availableProducts = updatedProducts.filter(p => p.stock > 0);
      setProducts(availableProducts);
      setFilteredProducts(availableProducts);

    } catch (error: any) {
      setError(error.message || 'Error al registrar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign size={16} className="text-success" />;
      case 'card': return <CreditCard size={16} className="text-info" />;
      case 'qr': return <Smartphone size={16} className="text-primary" />;
      case 'transfer': return <Smartphone size={16} className="text-warning" />;
      default: return null;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'qr': return 'QR';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  // Funciones para manejar clientes
  const handleCustomerSelected = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(false);
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
  };

  // Funciones para manejar el ticket
  const handleShowTicket = () => {
    setShowTicket(true);
  };

  const handleCloseTicket = () => {
    setShowTicket(false);
  };

  const handleTicketPrinted = () => {
    setShowTicket(false);
    setTicketData(null);
  };

  const handleTicketClosed = () => {
    setShowTicket(false);
    setTicketData(null);
  };

  // Función para mostrar ticket de una venta específica
  const handleShowSaleTicket = async (saleId: number) => {
    try {
      setIsLoading(true);
      const ticketInfo = await getTicketData([saleId]);
      setTicketData(ticketInfo);
      setShowTicket(true);
    } catch (error) {
      console.error('Error generando ticket:', error);
      setError('Error al generar el ticket');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0 d-flex align-items-center">
            <ShoppingCart size={20} className="me-2" />
            Registrar Ventas
            {salesItems.length > 0 && (
              <span className="badge bg-light text-primary ms-2">
                <Save size={12} className="me-1" />
                Auto-guardado
              </span>
            )}
          </h5>
        </div>
        <div className="card-body">
          {/* Notificación de draft pendiente */}
          {hasPendingDraft && (
            <div className="alert alert-info d-flex align-items-center mb-3" role="alert">
              <AlertCircle size={20} className="me-2" />
              <div className="flex-grow-1">
                <strong>📋 Datos pendientes encontrados</strong>
                <br />
                <small>Se encontraron ventas no finalizadas: {draftSummary}</small>
              </div>
              <div className="ms-2">
                <button 
                  className="btn btn-sm btn-success me-2"
                  onClick={loadPendingDraft}
                  title="Recuperar datos pendientes"
                >
                  <Save size={14} className="me-1" />
                  Recuperar
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={discardPendingDraft}
                  title="Descartar datos pendientes"
                >
                  <Trash2 size={14} className="me-1" />
                  Descartar
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Buscador de productos */}
            <div className="mb-3">
              <label className="form-label fw-bold">Buscar Producto</label>
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre, marca o color..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Resultados de búsqueda */}
              {searchTerm && filteredProducts.length > 0 && (
                <div className="mt-2 border rounded p-2 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className="d-flex justify-content-between align-items-center py-1 px-2 hover-bg-primary rounded cursor-pointer"
                      onClick={() => addSaleItem(product)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <strong>{product.name}</strong> - {product.brand}
                        {product.color && <span className="text-muted"> ({product.color})</span>}
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">${product.price.toLocaleString('es-CL')}</div>
                        <small className="text-muted">Stock: {product.stock}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchTerm && filteredProducts.length === 0 && (
                <div className="mt-2 text-muted text-center py-2">
                  No se encontraron productos
                </div>
              )}
            </div>

            {/* Sección de Cliente */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-bold mb-0">Cliente (Opcional)</label>
                <button 
                  type="button" 
                  className="btn btn-outline-success btn-sm"
                  onClick={() => setShowCustomerForm(true)}
                >
                  <User size={16} className="me-1" />
                  {selectedCustomer ? 'Cambiar Cliente' : 'Agregar Cliente'}
                </button>
              </div>
              
              {selectedCustomer ? (
                <div className="border rounded p-3 bg-light">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">{selectedCustomer.name}</h6>
                      {selectedCustomer.business_name && (
                        <p className="mb-1 text-muted"><strong>Razón Social:</strong> {selectedCustomer.business_name}</p>
                      )}
                      <p className="mb-1 text-muted"><strong>CUIT/DNI:</strong> {selectedCustomer.cuit_dni}</p>
                      <p className="mb-1 text-muted"><strong>Tipo:</strong> {selectedCustomer.customer_type.replace('_', ' ').toUpperCase()}</p>
                      {selectedCustomer.phone && (
                        <p className="mb-1 text-muted"><strong>Teléfono:</strong> {selectedCustomer.phone}</p>
                      )}
                      <div className="mt-2">
                        <span className={`badge ${
                          selectedCustomer.customer_type === 'responsable_inscripto' ? 'bg-primary' :
                          selectedCustomer.customer_type === 'monotributista' ? 'bg-warning' : 'bg-secondary'
                        }`}>
                          {selectedCustomer.customer_type === 'responsable_inscripto' ? 'FACTURA A' :
                           selectedCustomer.customer_type === 'monotributista' ? 'FACTURA B' : 'TICKET X'}
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setSelectedCustomer(null)}
                      title="Quitar cliente"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-3 border rounded bg-light">
                  <User size={24} className="mb-2 text-muted" />
                  <p className="mb-0">Sin cliente seleccionado</p>
                  <small>La venta se registrará como consumidor final</small>
                </div>
              )}
            </div>

            {/* Lista de productos a vender */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-bold mb-0">Productos a Vender</label>
                <button 
                  type="button" 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => filteredProducts.length > 0 && addSaleItem(filteredProducts[0])}
                  disabled={filteredProducts.length === 0}
                >
                  <Plus size={16} className="me-1" />
                  Agregar Primero
                </button>
              </div>
              
              {salesItems.length === 0 ? (
                <div className="text-center text-muted py-3">
                  No hay productos agregados
                </div>
              ) : (
                salesItems.map((item, index) => {
                  const totalItemPrice = item.applyPromotion && item.quantity >= 2 
                    ? (item.unitPrice * (item.quantity - 1)) 
                    : (item.unitPrice * item.quantity);

                  return (
                    <div key={index} className={`border rounded p-3 mb-2 ${item.applyPromotion && item.quantity >= 2 ? 'border-success' : ''}`}>
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <strong>{item.product.name}</strong>
                          <br />
                          <small className="text-muted">{item.product.brand} / {item.product.color || 'N/A'}</small>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Precio Unit.</label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateSaleItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Cantidad</label>
                          <div className="input-group input-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => handleQuantityChange(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="form-control text-center"
                              min="1"
                              max={item.product.stock}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => handleQuantityChange(index, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Método Pago</label>
                          <select
                            className="form-select form-select-sm"
                            value={item.paymentMethod}
                            onChange={(e) => updateSaleItem(index, 'paymentMethod', e.target.value)}
                          >
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="qr">QR</option>
                            <option value="transfer">Transferencia</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Total</label>
                          <div className="fw-bold text-success">
                            ${totalItemPrice.toLocaleString('es-CL')}
                          </div>
                        </div>
                        <div className="col-md-1">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeSaleItem(index)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Promoción 2x1 */}
                      {item.quantity >= 2 && (
                        <div className="row mt-2">
                          <div className="col-12">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={item.applyPromotion}
                                onChange={(e) => updateSaleItem(index, 'applyPromotion', e.target.checked)}
                              />
                              <label className="form-check-label text-success">
                                🎉 Aplicar promoción 2x1 (Ahorro: ${item.unitPrice.toLocaleString('es-CL')})
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Total y botón de envío */}
            {salesItems.length > 0 && (
              <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <div>
                  <h5 className="mb-0">Total: ${calculateTotal().toLocaleString('es-CL')}</h5>
                </div>
                <button
                  type="submit"
                  className="btn btn-success btn-lg"
                  disabled={isLoading || salesItems.length === 0}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} className="me-1" />
                      Registrar Venta
                    </>
                  )}
                </button>
              </div>
            )}


          </form>

          {/* Ventas recientes */}
          {recentSales.length > 0 && (
            <div className="mt-4">
              <h6 className="fw-bold mb-3">Ventas Recientes</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Método</th>
                      <th>Total</th>
                      <th>Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.slice(0, 5).map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <small>{sale.product?.name || 'Producto eliminado'}</small>
                        </td>
                        <td>{sale.quantity}</td>
                        <td>
                          <span className="d-flex align-items-center">
                            {getPaymentMethodIcon(sale.payment_method)}
                            <small className="ms-1">{getPaymentMethodLabel(sale.payment_method)}</small>
                          </span>
                        </td>
                        <td>
                          <small className="fw-bold">${sale.total_amount.toLocaleString('es-CL')}</small>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleShowSaleTicket(sale.id)}
                            disabled={isLoading}
                            title="Ver e imprimir ticket"
                          >
                            <FileText size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulario de cliente */}
      {showCustomerForm && (
        <CustomerForm
          onCustomerSelected={handleCustomerSelected}
          onClose={handleCloseCustomerForm}
        />
      )}

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
};

export default SalesForm;
