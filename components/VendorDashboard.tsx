"use client";

import { useState, useEffect } from 'react';
import { Vendor, CashSession, getActiveCashSession, openCashSession } from '@/services/vendorService';
import SalesWorkspace from './SalesWorkspace';
import CashClosingForm from './CashClosingForm';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VendorDashboardProps {
  vendor: Vendor;
}

const VendorDashboard = ({ vendor }: VendorDashboardProps) => {
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showClosing, setShowClosing] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        // Try to get existing active session
        let session = await getActiveCashSession(vendor.id);

        // Auto-open with $0 if no session exists
        if (!session) {
          session = await openCashSession(vendor.id, 0);
        }

        setCashSession(session);
      } catch (error) {
        console.error('Error initializing cash session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [vendor.id, refreshKey]);

  const handleCashClosed = () => {
    setCashSession(null);
    setShowClosing(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleSaleRegistered = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border" style={{ color: 'var(--ms-accent)' }} role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!cashSession) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="text-center">
          <div className="spinner-border mb-3" style={{ color: 'var(--ms-accent)' }} role="status" />
          <p style={{ color: 'var(--ms-text-muted)' }}>Iniciando sesion de venta...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Compact session status bar */}
      <div
        className="mb-3 ms-animate-in"
        style={{
          background: 'var(--ms-bg-raised)',
          border: '1px solid var(--ms-border)',
          borderRadius: 'var(--ms-radius-md)',
          padding: '0.6rem 1rem'
        }}
      >
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <div style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: 'var(--ms-green)',
                boxShadow: '0 0 8px var(--ms-green)'
              }} />
              <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>Caja Activa</span>
            </div>
            <div style={{ height: 16, width: 1, background: 'var(--ms-border)' }} />
            <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
              Apertura: <strong style={{ color: 'var(--ms-green)' }}>${cashSession.opening_cash.toLocaleString('es-CL')}</strong>
            </span>
            <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
              Ventas: <strong style={{ color: 'var(--ms-accent-light)' }}>${cashSession.total_sales.toLocaleString('es-CL')}</strong>
            </span>
            <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
              Efectivo: <strong style={{ color: 'var(--ms-green)' }}>${cashSession.cash_sales.toLocaleString('es-CL')}</strong>
            </span>
            <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
              Tarjeta: <strong style={{ color: 'var(--ms-blue)' }}>${cashSession.card_sales.toLocaleString('es-CL')}</strong>
            </span>
            <span style={{ color: 'var(--ms-text-muted)', fontSize: '0.8rem' }}>
              Digital: <strong style={{ color: 'var(--ms-accent-light)' }}>${cashSession.digital_sales.toLocaleString('es-CL')}</strong>
            </span>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setShowClosing(!showClosing)}
            style={{
              background: showClosing ? 'var(--ms-red-dim)' : 'var(--ms-bg-surface)',
              color: showClosing ? 'var(--ms-red)' : 'var(--ms-text-muted)',
              border: `1px solid ${showClosing ? 'rgba(255,107,107,0.3)' : 'var(--ms-border)'}`,
              fontSize: '0.8rem',
              padding: '0.3rem 0.75rem'
            }}
          >
            {showClosing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="ms-1">Cerrar Caja</span>
          </button>
        </div>
      </div>

      {/* Closing form (collapsible) */}
      {showClosing && (
        <div className="mb-3 ms-animate-in">
          <CashClosingForm
            cashSession={cashSession}
            onCashClosed={handleCashClosed}
          />
        </div>
      )}

      {/* Main Sales Workspace */}
      <SalesWorkspace
        cashSession={cashSession}
        onSaleRegistered={handleSaleRegistered}
      />
    </div>
  );
};

export default VendorDashboard;
