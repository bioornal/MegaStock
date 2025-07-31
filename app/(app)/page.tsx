"use client";

import { useState } from 'react';
import ProductTable from "@/components/ProductTable";
import AddProductForm from '@/components/AddProductForm';

export default function ProductsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Estado para forzar la recarga de la tabla

  const handleProductAdded = () => {
    setShowAddForm(false); // Oculta el formulario
    setRefreshKey(oldKey => oldKey + 1); // Cambia la key para que ProductTable se recargue
  };

  return (
    <>
      {showAddForm && (
        <AddProductForm 
          onProductAdded={handleProductAdded} 
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Gestión de Productos</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
            {showAddForm ? 'Cancelar' : 'Añadir Producto'}
          </button>
        </div>
        <div className="card-body">
          <ProductTable key={refreshKey} />
        </div>
      </div>
    </>
  );
}
