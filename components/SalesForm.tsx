"use client";

import { useState, useEffect } from 'react';
import { CashSession, registerSale, getSalesBySession, Sale } from '@/services/vendorService';
import { getProducts, Product } from '@/services/productService';
import { ShoppingCart, Plus, Trash2, CreditCard, Smartphone, DollarSign, Search, Save, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/lib/hooks';
import { salesPersistence } from '@/lib/salesPersistence';

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

  // Filtrar productos basado en búsqueda y stock disponible en el carrito
  useEffect(() => {
    const itemsInCart = salesItems.reduce((acc, item) => {
      acc[item.product.id] = item.quantity;
      return acc;
    }, {} as { [key: string]: number });

    const availableProducts = products.filter(p => {
      const quantityInCart = itemsInCart[p.id] || 0;
      return p.stock > quantityInCart;
    });

    if (debouncedSearchTerm.trim() === '') {
      setFilteredProducts([]);
    } else {
      const filtered = availableProducts.filter(product => 
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (product.color && product.color.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered.slice(0, 10));
    }
  }, [debouncedSearchTerm, products, salesItems]);

  // Auto-guardado cuando cambian los items de venta
  useEffect(() => {
    if (salesItems.length > 0) {
      salesPersistence.saveDraft(cashSession.vendor_id, cashSession.id, salesItems);
    }
  }, [salesItems, cashSession.vendor_id, cashSession.id]);

  // Iniciar auto-guardado al montar el componente
  useEffect(() => {
    salesPersistence.startAutoSave(
      cashSession.vendor_id, 
      cashSession.id, 
      () => salesItems
    );

    // Cleanup al desmontar
    return () => {
      salesPersistence.stopAutoSave();
    };
  }, [cashSession.vendor_id, cashSession.id, salesItems]);

  const handleQuantityChange = (index: number, newQuantity: number) => {
    const item = salesItems[index];
    if (!item) return;

    const quantity = Math.max(1, Math.min(newQuantity, item.product.stock));

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
      // Registrar cada item como una venta separada
      for (const item of salesItems) {
        await registerSale({
          cash_session_id: cashSession.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_amount: item.applyPromotion && item.quantity >= 2
            ? item.unitPrice * (item.quantity - 1)
            : item.unitPrice * item.quantity,
          payment_method: item.paymentMethod
        });
      }

      // Limpiar draft después de guardar exitosamente
      salesPersistence.clearDraft(cashSession.vendor_id, cashSession.id);
      
      // Limpiar formulario y actualizar datos
      setSalesItems([]);
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

  return (
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
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => updateSaleItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Total</label>
                        <div className="fw-bold">
                          ${totalItemPrice.toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Método Pago</label>
                        <select
                          className="form-select form-select-sm"
                          value={item.paymentMethod}
                          onChange={(e) => updateSaleItem(index, 'paymentMethod', e.target.value as SaleItem['paymentMethod'])}
                        >
                          <option value="cash">💵 Efectivo</option>
                          <option value="card">💳 Tarjeta</option>
                          <option value="qr">📱 QR</option>
                          <option value="transfer">🏦 Transferencia</option>
                        </select>
                      </div>
                      <div className="col-md-1 text-end">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeSaleItem(index)}
                          title="Eliminar producto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {item.quantity >= 2 && (
                      <div className="mt-2 pt-2 border-top">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={item.applyPromotion}
                            onChange={(e) => updateSaleItem(index, 'applyPromotion', e.target.checked)}
                            id={`promo-${index}`}
                          />
                          <label className="form-check-label text-success fw-bold" htmlFor={`promo-${index}`}>
                            🎉 Aplicar promoción 2x1 (1 unidad gratis)
                          </label>
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
            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
              <div className="h5 mb-0">
                Total: <span className="text-success">${calculateTotal().toLocaleString('es-CL')}</span>
              </div>
              <button
                type="submit"
                className="btn btn-success"
                disabled={isLoading || salesItems.length === 0}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesForm;
