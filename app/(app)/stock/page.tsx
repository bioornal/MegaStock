"use client";

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { useState } from 'react';
import StockUpdateForm from '@/components/StockUpdateForm';
import ProductTable from '@/components/ProductTable';
import { Package, List } from 'lucide-react';

const StockPage = () => {
  const [activeTab, setActiveTab] = useState<'update' | 'view'>('update');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStockUpdate = () => {
    // Forzar actualización de la tabla de productos
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container-fluid px-0">
      {/* Encabezado */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body d-flex align-items-center">
              <div className="me-3 text-primary" style={{ lineHeight: 0 }}>
                <Package size={28} />
              </div>
              <div>
                <h1 className="h4 mb-1">Gestión de Stock</h1>
                <small className="text-muted">Actualiza el inventario cuando lleguen nuevos productos a tu tienda</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="row mb-3">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'update' ? 'active' : ''}`}
                onClick={() => setActiveTab('update')}
              >
                <span className="me-2"><Package size={16} /></span>
                Actualizar Stock
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'view' ? 'active' : ''}`}
                onClick={() => setActiveTab('view')}
              >
                <span className="me-2"><List size={16} /></span>
                Ver Inventario
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Contenido */}
      <div className="row">
        <div className="col-12">
          {activeTab === 'update' && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <StockUpdateForm onStockUpdate={handleStockUpdate} />
              </div>
            </div>
          )}

          {activeTab === 'view' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-light border-0 py-2">
                <h6 className="mb-0 text-primary">Inventario Actual</h6>
                <small className="text-muted">Vista completa de todos los productos en stock</small>
              </div>
              <div className="card-body p-0">
                <ProductTable key={refreshKey} onProductsChange={handleStockUpdate} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockPage;
