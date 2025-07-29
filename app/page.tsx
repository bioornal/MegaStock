"use client";

import ProductTable from "@/components/ProductTable";

// Esta es ahora la página principal que muestra la tabla de productos.
export default function ProductsPage() {
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white">
        <h3 className="mb-0">Gestión de Productos</h3>
      </div>
      <div className="card-body">
        <ProductTable />
      </div>
    </div>
  );
}
