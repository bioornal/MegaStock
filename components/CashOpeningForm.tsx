"use client";

import { useState } from 'react';
import { Vendor, CashSession, openCashSession } from '@/services/vendorService';
import { DollarSign, Play } from 'lucide-react';

interface CashOpeningFormProps {
  vendor: Vendor;
  onCashOpened: (session: CashSession) => void;
}

const CashOpeningForm = ({ vendor, onCashOpened }: CashOpeningFormProps) => {
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (openingCash < 0) {
      setError('El monto de apertura no puede ser negativo');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const session = await openCashSession(vendor.id, openingCash);
      onCashOpened(session);
    } catch (error: any) {
      setError(error.message || 'Error al abrir la caja');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header bg-warning text-dark">
            <h5 className="mb-0 d-flex align-items-center">
              <DollarSign size={20} className="me-2" />
              Apertura de Caja
            </h5>
          </div>
          <div className="card-body">
            <div className="text-center mb-4">
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" 
                   style={{ width: '80px', height: '80px' }}>
                <Play size={32} className="text-warning" />
              </div>
              <h6 className="mt-3">Iniciar Jornada de Trabajo</h6>
              <p className="text-muted">
                Ingresa el monto en efectivo con el que abres la caja para comenzar a registrar ventas.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="openingCash" className="form-label fw-bold">
                  Monto de Apertura (Efectivo)
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    className="form-control"
                    id="openingCash"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="100"
                    placeholder="0"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-text">
                  Ingresa el dinero en efectivo con el que inicias el día (billetes y monedas).
                </div>
              </div>

              <div className="d-grid">
                <button 
                  type="submit" 
                  className="btn btn-warning btn-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Abriendo Caja...
                    </>
                  ) : (
                    <>
                      <Play size={20} className="me-2" />
                      Abrir Caja y Comenzar Ventas
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-light rounded">
              <h6 className="text-muted mb-2">💡 Recordatorio:</h6>
              <ul className="text-muted mb-0 small">
                <li>Cuenta todo el efectivo disponible (billetes y monedas)</li>
                <li>No incluyas dinero de tarjetas o transferencias</li>
                <li>Este monto se usará para calcular el dinero a rendir al final del día</li>
                <li>Puedes ingresar 0 si no tienes efectivo inicial</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashOpeningForm;
