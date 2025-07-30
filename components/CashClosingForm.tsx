"use client";

import { useState } from 'react';
import { CashSession, closeCashSession } from '@/services/vendorService';
import { StopCircle, Calculator, AlertTriangle } from 'lucide-react';

interface CashClosingFormProps {
  cashSession: CashSession;
  onCashClosed: () => void;
}

const CashClosingForm = ({ cashSession, onCashClosed }: CashClosingFormProps) => {
  const [closingCash, setClosingCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showClosingForm, setShowClosingForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (closingCash < 0) {
      setError('El monto de cierre no puede ser negativo');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await closeCashSession(cashSession.id, closingCash);
      onCashClosed();
    } catch (error: any) {
      setError(error.message || 'Error al cerrar la caja');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDifference = () => {
    return closingCash - cashSession.cash_to_render;
  };

  const getDifferenceColor = () => {
    const diff = calculateDifference();
    if (diff > 0) return 'text-success';
    if (diff < 0) return 'text-danger';
    return 'text-muted';
  };

  const getDifferenceText = () => {
    const diff = calculateDifference();
    if (diff > 0) return `Sobrante: $${diff.toLocaleString('es-CL')}`;
    if (diff < 0) return `Faltante: $${Math.abs(diff).toLocaleString('es-CL')}`;
    return 'Cuadra exacto ✓';
  };

  if (!showClosingForm) {
    return (
      <div className="card border-warning">
        <div className="card-header bg-warning text-dark">
          <h6 className="mb-0 d-flex align-items-center">
            <StopCircle size={18} className="me-2" />
            Cierre de Caja
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <p className="mb-2">
                <strong>Dinero que debes rendir:</strong> 
                <span className="text-warning fs-5 ms-2">
                  ${cashSession.cash_to_render.toLocaleString('es-CL')}
                </span>
              </p>
              <p className="text-muted mb-0">
                Este monto incluye tu apertura (${cashSession.opening_cash.toLocaleString('es-CL')}) 
                + ventas en efectivo (${cashSession.cash_sales.toLocaleString('es-CL')})
              </p>
            </div>
            <div className="col-md-4 text-md-end">
              <button 
                className="btn btn-warning"
                onClick={() => setShowClosingForm(true)}
              >
                <StopCircle size={18} className="me-2" />
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-danger">
      <div className="card-header bg-danger text-white">
        <h6 className="mb-0 d-flex align-items-center">
          <StopCircle size={18} className="me-2" />
          Cerrar Caja - Conteo Final
        </h6>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title d-flex align-items-center">
                  <Calculator size={18} className="me-2" />
                  Resumen del Día
                </h6>
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Apertura:</small>
                    <div className="fw-bold">${cashSession.opening_cash.toLocaleString('es-CL')}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Ventas Efectivo:</small>
                    <div className="fw-bold text-success">${cashSession.cash_sales.toLocaleString('es-CL')}</div>
                  </div>
                </div>
                <hr className="my-2" />
                <div className="row">
                  <div className="col-6">
                    <small className="text-muted">Ventas Tarjeta:</small>
                    <div className="fw-bold text-info">${cashSession.card_sales.toLocaleString('es-CL')}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Ventas Digitales:</small>
                    <div className="fw-bold text-primary">${cashSession.digital_sales.toLocaleString('es-CL')}</div>
                  </div>
                </div>
                <hr className="my-2" />
                <div className="text-center">
                  <small className="text-muted">Total Ventas del Día:</small>
                  <div className="fw-bold fs-5">${cashSession.total_sales.toLocaleString('es-CL')}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card border-warning">
              <div className="card-body text-center">
                <h6 className="card-title text-warning">💰 Dinero a Rendir</h6>
                <div className="display-6 fw-bold text-warning mb-2">
                  ${cashSession.cash_to_render.toLocaleString('es-CL')}
                </div>
                <small className="text-muted">
                  (Apertura + Ventas en Efectivo)
                </small>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="closingCash" className="form-label fw-bold">
                Efectivo Real en Caja
              </label>
              <div className="input-group input-group-lg">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  className="form-control"
                  id="closingCash"
                  value={closingCash}
                  onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="100"
                  placeholder="0"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-text">
                Cuenta todo el efectivo que tienes en la caja (billetes y monedas)
              </div>
            </div>
            
            <div className="col-md-6">
              <label className="form-label fw-bold">Diferencia</label>
              <div className="card">
                <div className="card-body text-center">
                  <div className={`fs-4 fw-bold ${getDifferenceColor()}`}>
                    {closingCash > 0 ? getDifferenceText() : 'Ingresa el monto'}
                  </div>
                  {calculateDifference() !== 0 && closingCash > 0 && (
                    <div className="mt-2">
                      {calculateDifference() > 0 ? (
                        <div className="alert alert-success py-2 mb-0">
                          <small>Tienes dinero de más. Verifica el conteo.</small>
                        </div>
                      ) : (
                        <div className="alert alert-danger py-2 mb-0">
                          <small>Falta dinero. Revisa las ventas y el conteo.</small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <button 
                type="button"
                className="btn btn-secondary w-100"
                onClick={() => setShowClosingForm(false)}
                disabled={isLoading}
              >
                Cancelar
              </button>
            </div>
            <div className="col-md-6">
              <button 
                type="submit" 
                className="btn btn-danger w-100"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Cerrando...
                  </>
                ) : (
                  <>
                    <StopCircle size={18} className="me-2" />
                    Cerrar Caja Definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 p-3 bg-light rounded">
          <div className="d-flex align-items-start">
            <AlertTriangle size={20} className="text-warning me-2 mt-1" />
            <div>
              <h6 className="text-warning mb-1">Importante:</h6>
              <ul className="text-muted mb-0 small">
                <li>Una vez cerrada la caja, no podrás registrar más ventas del día</li>
                <li>Asegúrate de haber registrado todas las ventas</li>
                <li>El dinero de tarjetas y transferencias no se incluye en el monto a rendir</li>
                <li>Guarda este resumen para tu control diario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashClosingForm;
