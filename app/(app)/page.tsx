"use client";

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import DashboardStats from '@/components/DashboardStats';
import ProductTable from '@/components/ProductTable';
import ViewerDashboard from '@/components/ViewerDashboard';
import AddProductForm from '@/components/AddProductForm';
import { AlertTriangle, Plus } from 'lucide-react';

export default function HomePage() {
  const { user, loading, isAdmin, error } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border mb-3" style={{ color: 'var(--ms-accent)' }} role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p style={{ color: 'var(--ms-text-muted)' }}>Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div
          style={{
            background: 'var(--ms-red-dim)',
            border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: 'var(--ms-radius-md)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--ms-red)' }} />
          <div>
            <h5 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--ms-red)', marginBottom: '0.25rem', fontSize: '1rem' }}>
              Error de Autenticacion
            </h5>
            <p style={{ color: 'var(--ms-text-secondary)', margin: 0, fontSize: '0.9rem' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mt-5">
        <div
          style={{
            background: 'var(--ms-amber-dim)',
            border: '1px solid rgba(253,203,110,0.2)',
            borderRadius: 'var(--ms-radius-md)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--ms-amber)' }} />
          <div>
            <h5 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--ms-amber)', marginBottom: '0.25rem', fontSize: '1rem' }}>
              Acceso Denegado
            </h5>
            <p style={{ color: 'var(--ms-text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Debes iniciar sesion para acceder al sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="row mt-3 g-0">
        <aside
          className="col-md-3 col-lg-2 p-3 d-none d-md-block"
          style={{
            background: 'var(--ms-bg-base)',
            borderRight: '1px solid var(--ms-border)',
            minHeight: 'calc(100vh - 56px)'
          }}
        >
          <DashboardStats />
        </aside>
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="pt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Inventario
              </h3>
              <button
                className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setShowAddForm((v) => !v)}
              >
                {showAddForm ? 'Cancelar' : (
                  <span className="d-inline-flex align-items-center gap-1">
                    <Plus size={18} /> Nuevo Producto
                  </span>
                )}
              </button>
            </div>

            {showAddForm && (
              <AddProductForm
                onProductAdded={() => {
                  setShowAddForm(false);
                  setReloadKey((k) => k + 1);
                }}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            <ProductTable key={reloadKey} />
          </div>
        </main>
      </div>
    );
  }

  return <ViewerDashboard />;
}
