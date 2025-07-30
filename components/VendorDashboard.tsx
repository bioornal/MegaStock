"use client";

import { useState, useEffect } from 'react';
import { Vendor, CashSession, getActiveCashSession, openCashSession, closeCashSession } from '@/services/vendorService';
import CashOpeningForm from './CashOpeningForm';
import SalesForm from './SalesForm';
import CashClosingForm from './CashClosingForm';
import { DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface VendorDashboardProps {
  vendor: Vendor;
}

const VendorDashboard = ({ vendor }: VendorDashboardProps) => {
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchCashSession = async () => {
      setIsLoading(true);
      try {
        const session = await getActiveCashSession(vendor.id);
        setCashSession(session);
      } catch (error) {
        console.error('Error fetching cash session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCashSession();
  }, [vendor.id, refreshKey]);

  const handleCashOpened = (session: CashSession) => {
    setCashSession(session);
  };

  const handleCashClosed = () => {
    setCashSession(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleSaleRegistered = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header del vendedor */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h4 className="mb-1">👤 {vendor.name}</h4>
                  <p className="text-muted mb-0">
                    {new Date().toLocaleDateString('es-CL', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="col-md-6 text-md-end">
                  <div className="d-flex align-items-center justify-content-md-end">
                    {cashSession ? (
                      <div className="d-flex align-items-center text-success">
                        <CheckCircle size={20} className="me-2" />
                        <span className="fw-bold">Caja Abierta</span>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center text-warning">
                        <AlertCircle size={20} className="me-2" />
                        <span className="fw-bold">Caja Cerrada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal según estado de la caja */}
      {!cashSession ? (
        // Formulario de apertura de caja
        <CashOpeningForm 
          vendor={vendor} 
          onCashOpened={handleCashOpened}
        />
      ) : (
        <div className="row">
          {/* Información de la sesión actual */}
          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h6 className="mb-0 d-flex align-items-center">
                  <DollarSign size={18} className="me-2" />
                  Resumen de Caja
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted">Apertura:</small>
                  <div className="fw-bold text-success">
                    ${cashSession.opening_cash.toLocaleString('es-CL')}
                  </div>
                </div>
                
                <div className="mb-3">
                  <small className="text-muted">Total Ventas:</small>
                  <div className="fw-bold">
                    ${cashSession.total_sales.toLocaleString('es-CL')}
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <small className="text-muted">💵 Efectivo:</small>
                    <div className="fw-bold text-success">
                      ${cashSession.cash_sales.toLocaleString('es-CL')}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">💳 Tarjeta:</small>
                    <div className="fw-bold text-info">
                      ${cashSession.card_sales.toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">📱 Digital (QR/Transfer):</small>
                  <div className="fw-bold text-primary">
                    ${cashSession.digital_sales.toLocaleString('es-CL')}
                  </div>
                </div>

                <hr />
                
                <div className="mb-3">
                  <small className="text-muted">💰 Dinero a Rendir:</small>
                  <div className="fw-bold text-warning fs-5">
                    ${cashSession.cash_to_render.toLocaleString('es-CL')}
                  </div>
                </div>

                <div className="d-flex align-items-center text-muted">
                  <Clock size={16} className="me-2" />
                  <small>
                    Abierta: {new Date(cashSession.opened_at).toLocaleTimeString('es-CL')}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de ventas */}
          <div className="col-md-8 mb-4">
            <SalesForm 
              cashSession={cashSession}
              onSaleRegistered={handleSaleRegistered}
            />
          </div>

          {/* Formulario de cierre de caja */}
          <div className="col-12">
            <CashClosingForm 
              cashSession={cashSession}
              onCashClosed={handleCashClosed}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
