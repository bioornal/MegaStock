"use client";

import { useAuth } from '@/lib/hooks/useAuth';
import DashboardStats from '@/components/DashboardStats';
import ProductTable from '@/components/ProductTable';
import ViewerDashboard from '@/components/ViewerDashboard';
import { AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isAdmin, error } = useAuth();

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted">Verificando permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <AlertTriangle className="me-2" size={20} />
          <div>
            <h5 className="alert-heading">Error de Autenticación</h5>
            <p className="mb-0">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <AlertTriangle className="me-2" size={20} />
          <div>
            <h5 className="alert-heading">Acceso Denegado</h5>
            <p className="mb-0">Debes iniciar sesión para acceder al sistema.</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard para administradores
  if (isAdmin) {
    return (
      <div className="row mt-4">
        <aside className="col-md-3 col-lg-2 bg-light p-4 border-end min-vh-100 d-none d-md-block">
          <DashboardStats />
        </aside>
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="pt-3">
            <ProductTable />
          </div>
        </main>
      </div>
    );
  }

  // Dashboard para usuarios viewer (solo consulta de stock)
  return <ViewerDashboard />;
}
