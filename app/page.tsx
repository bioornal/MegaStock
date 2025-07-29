"use client";

import ProductTable from "@/components/ProductTable";
import Link from 'next/link';

// Esta es ahora la página principal que muestra la tabla de productos.
export default function ProductsPage() {
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h3 className="mb-0">Gestión de Productos</h3>
        <Link href="/new" className="btn btn-primary">
          Añadir Producto
        </Link>
      </div>
      <div className="card-body">
        <ProductTable />
      </div>
    </div>
  );
}
