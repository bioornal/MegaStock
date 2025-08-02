"use client";

import { useState, useEffect } from 'react';
import { Vendor, CashSession, getActiveCashSession, openCashSession, closeCashSession } from '@/services/vendorService';
import CashOpeningForm from './CashOpeningForm';
import ImprovedSalesForm from './ImprovedSalesForm';
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
      {/* Contenido principal según estado de la caja */}
      {!cashSession ? (
        // Formulario de apertura de caja
        <CashOpeningForm 
          vendor={vendor} 
          onCashOpened={handleCashOpened}
        />
      ) : (
        <>
          {/* Resumen de Caja Súper Compacto */}
          <div className="row mb-2">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-2">
                  <div className="row g-2 align-items-center text-center">
                    <div className="col-md-2">
                      <small className="text-muted d-block">Apertura</small>
                      <strong className="text-success">${cashSession.opening_cash.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">Total Ventas</small>
                      <strong className="text-primary">${cashSession.total_sales.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">💵 Efectivo</small>
                      <strong className="text-success">${cashSession.cash_sales.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">💳 Tarjeta</small>
                      <strong className="text-info">${cashSession.card_sales.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">📱 Digital</small>
                      <strong className="text-primary">${cashSession.digital_sales.toLocaleString('es-CL')}</strong>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted d-block">💰 A Rendir</small>
                      <strong className="text-warning">${cashSession.cash_to_render.toLocaleString('es-CL')}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Panel de Ventas - Ahora ocupa todo el ancho */}
            <div className="col-12 mb-4">
              <ImprovedSalesForm 
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
        </>
      )}
    </div>
  );
};

export default VendorDashboard;
