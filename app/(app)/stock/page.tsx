"use client";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header simplificado */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Stock</h1>
          </div>
          <p className="text-gray-600">
            Actualiza el inventario cuando lleguen nuevos productos a tu tienda
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('update')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'update'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Actualizar Stock
                </div>
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'view'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Ver Inventario
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {activeTab === 'update' && (
            <StockUpdateForm onStockUpdate={handleStockUpdate} />
          )}

          {activeTab === 'view' && (
            <div>
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Inventario Actual</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Vista completa de todos los productos en stock
                  </p>
                </div>
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
