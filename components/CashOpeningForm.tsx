"use client";

import { useState } from 'react';
import { Vendor, CashSession, openCashSession } from '@/services/vendorService';
import { DollarSign, Play, Plus, Minus, Info } from 'lucide-react';

interface CashOpeningFormProps {
  vendor: Vendor;
  onCashOpened: (session: CashSession) => void;
}

const CashOpeningForm = ({ vendor, onCashOpened }: CashOpeningFormProps) => {
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const formatCLP = (n: number) => {
    try {
      return n.toLocaleString('es-CL');
    } catch {
      return `${n}`;
    }
  };

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

  const handleQuickAdd = (amount: number) => {
    setOpeningCash(prev => Math.max(0, prev + amount));
  };

  const handleStep = (delta: number) => {
    setOpeningCash(prev => Math.max(0, prev + delta));
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      // Permite enviar con Enter desde cualquier input del formulario
      e.preventDefault();
      // Llama a submit programáticamente
      // Simula click en botón principal
      (e.currentTarget.querySelector('#btn-open-cash') as HTMLButtonElement)?.click();
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6 col-md-8">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            {/* Header limpio */}
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 48, height: 48, background: '#EEF3FF' }}>
                <DollarSign size={22} className="text-primary" />
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-0">Apertura de Caja</h5>
                <small className="text-muted">Vendedor: <strong>{vendor?.name || 'Vendedor'}</strong></small>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
              {/* Input principal */}
              <label htmlFor="openingCash" className="form-label fw-semibold">Monto de apertura (efectivo)</label>
              <div className="input-group input-group-lg mb-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => handleStep(-1000)} disabled={isLoading} aria-label="Restar 1000">
                  <Minus size={18} />
                </button>
                <span className="input-group-text bg-white border-1">$</span>
                <input
                  type="number"
                  className="form-control"
                  id="openingCash"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0}
                  step={1000}
                  placeholder="0"
                  required
                  disabled={isLoading}
                  inputMode="numeric"
                />
                <button type="button" className="btn btn-outline-secondary" onClick={() => handleStep(1000)} disabled={isLoading} aria-label="Sumar 1000">
                  <Plus size={18} />
                </button>
              </div>
              <div className="text-muted small mb-3">Vista previa: <strong className="text-dark">${formatCLP(openingCash)}</strong></div>

              {/* Presets rápidos */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                {[10000, 20000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-light border"
                    onClick={() => handleQuickAdd(amt)}
                    disabled={isLoading}
                  >
                    + ${formatCLP(amt)}
                  </button>
                ))}
                <button type="button" className="btn btn-outline-secondary" onClick={() => setOpeningCash(0)} disabled={isLoading}>Reset</button>
              </div>

              {/* Acción principal */}
              <div className="d-grid">
                <button
                  id="btn-open-cash"
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Abriendo caja...
                    </>
                  ) : (
                    <>
                      <Play size={20} className="me-2" />
                      Abrir caja y comenzar ventas
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Tips compactos */}
            <div className="mt-4 p-3 bg-light rounded border">
              <div className="d-flex align-items-center mb-2">
                <Info size={16} className="text-muted me-2" />
                <h6 className="text-muted mb-0">Recordatorios</h6>
              </div>
              <ul className="text-muted mb-0 small">
                <li>Incluye solo efectivo (billetes y monedas).</li>
                <li>Tarjetas/transferencias no van en el monto de apertura.</li>
                <li>Puedes abrir con $0 si no hay efectivo inicial.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashOpeningForm;
