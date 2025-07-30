"use client";

import { useState, useEffect } from 'react';
import { getMonthlySalesTotal, resetMonthlySales } from '@/services/vendorService';
import { Calendar, TrendingUp, DollarSign, CreditCard, Smartphone, RotateCcw, Lock } from 'lucide-react';

interface MonthlySalesData {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  digitalSales: number;
  sessionsCount: number;
  month: string;
  year: number;
}

const MonthlySalesCard = () => {
  const [salesData, setSalesData] = useState<MonthlySalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchMonthlySales = async () => {
    setIsLoading(true);
    try {
      const data = await getMonthlySalesTotal();
      setSalesData(data);
    } catch (err) {
      console.error('Error fetching monthly sales:', err);
      setError('Error al cargar las ventas mensuales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySales();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchMonthlySales, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResetSales = async () => {
    if (resetPassword !== '110685') {
      setResetError('Contraseña incorrecta');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      const result = await resetMonthlySales();
      console.log(`Se eliminaron ${result.deletedCount} sesiones de venta`);
      
      // Actualizar los datos después del reset
      await fetchMonthlySales();
      
      // Cerrar modal y limpiar formulario
      setShowResetModal(false);
      setResetPassword('');
      
      alert(`✅ Ventas mensuales reseteadas exitosamente\n${result.deletedCount} sesiones eliminadas`);
    } catch (err) {
      console.error('Error resetting sales:', err);
      setResetError('Error al resetear las ventas. Inténtalo de nuevo.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCloseModal = () => {
    setShowResetModal(false);
    setResetPassword('');
    setResetError('');
  };

  if (isLoading) {
    return (
      <div className="card shadow-sm">
        <div className="card-header bg-success text-white">
          <h6 className="mb-0 d-flex align-items-center">
            <Calendar size={18} className="me-2" />
            Ventas del Mes
          </h6>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2 text-muted mb-0">Calculando ventas mensuales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card shadow-sm border-danger">
        <div className="card-header bg-danger text-white">
          <h6 className="mb-0 d-flex align-items-center">
            <Calendar size={18} className="me-2" />
            Ventas del Mes
          </h6>
        </div>
        <div className="card-body text-center py-4">
          <p className="text-danger mb-0">{error}</p>
        </div>
      </div>
    );
  }

  if (!salesData) {
    return null;
  }

  return (
    <div className="card shadow-sm border-success">
      <div className="card-header bg-success text-white">
        <h6 className="mb-0 d-flex align-items-center">
          <Calendar size={18} className="me-2" />
          Ventas de {salesData.month} {salesData.year}
        </h6>
      </div>
      <div className="card-body">
        {/* Total principal */}
        <div className="text-center mb-3 pb-3 border-bottom">
          <div className="d-flex align-items-center justify-content-center mb-2">
            <TrendingUp size={24} className="text-success me-2" />
            <h5 className="mb-0 text-success">Total del Mes</h5>
          </div>
          <div className="display-6 fw-bold text-success">
            ${salesData.totalSales.toLocaleString('es-CL')}
          </div>
          <small className="text-muted">
            {salesData.sessionsCount} sesiones de venta
          </small>
        </div>

        {/* Desglose por método de pago */}
        <div className="row g-2">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between py-2">
              <div className="d-flex align-items-center">
                <DollarSign size={16} className="text-success me-2" />
                <span className="small fw-bold">Efectivo</span>
              </div>
              <span className="fw-bold text-success">
                ${salesData.cashSales.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
          
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between py-2">
              <div className="d-flex align-items-center">
                <CreditCard size={16} className="text-info me-2" />
                <span className="small fw-bold">Tarjetas</span>
              </div>
              <span className="fw-bold text-info">
                ${salesData.cardSales.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
          
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between py-2">
              <div className="d-flex align-items-center">
                <Smartphone size={16} className="text-primary me-2" />
                <span className="small fw-bold">Digital (QR/Transfer)</span>
              </div>
              <span className="fw-bold text-primary">
                ${salesData.digitalSales.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-3 pt-3 border-top">
          <div className="row text-center">
            <div className="col-6">
              <div className="small text-muted">Promedio Diario</div>
              <div className="fw-bold">
                ${Math.round(salesData.totalSales / new Date().getDate()).toLocaleString('es-CL')}
              </div>
            </div>
            <div className="col-6">
              <div className="small text-muted">% Efectivo</div>
              <div className="fw-bold">
                {salesData.totalSales > 0 
                  ? Math.round((salesData.cashSales / salesData.totalSales) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de actualización */}
        <div className="mt-2 text-center">
          <small className="text-muted">
            Actualizado: {new Date().toLocaleTimeString('es-CL')}
          </small>
        </div>

        {/* Botón de reset */}
        <div className="mt-3 pt-3 border-top text-center">
          <button 
            className="btn btn-outline-danger btn-sm"
            onClick={() => setShowResetModal(true)}
            title="Resetear ventas mensuales"
          >
            <RotateCcw size={14} className="me-1" />
            Resetear Mes
          </button>
        </div>
      </div>

      {/* Modal de confirmación de reset */}
      {showResetModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <Lock size={20} className="me-2" />
                  Resetear Ventas Mensuales
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning d-flex align-items-center">
                  <RotateCcw size={20} className="me-2" />
                  <div>
                    <strong>¡Atención!</strong> Esta acción eliminará TODAS las ventas de {salesData?.month} {salesData?.year}.
                    <br />
                    <small>Se eliminarán {salesData?.sessionsCount} sesiones y todas sus ventas asociadas.</small>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="resetPassword" className="form-label fw-bold">
                    Ingresa la contraseña para confirmar:
                  </label>
                  <input
                    type="password"
                    className={`form-control ${resetError ? 'is-invalid' : ''}`}
                    id="resetPassword"
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      setResetError('');
                    }}
                    placeholder="Contraseña requerida"
                    disabled={isResetting}
                  />
                  {resetError && (
                    <div className="invalid-feedback">
                      {resetError}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseModal}
                  disabled={isResetting}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleResetSales}
                  disabled={isResetting || !resetPassword}
                >
                  {isResetting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Reseteando...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} className="me-1" />
                      Confirmar Reset
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlySalesCard;
