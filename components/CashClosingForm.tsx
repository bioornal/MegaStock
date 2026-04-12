"use client";

import { useState } from 'react';
import { CashSession, closeCashSession } from '@/services/vendorService';
import { StopCircle, AlertTriangle } from 'lucide-react';

interface CashClosingFormProps {
  cashSession: CashSession;
  onCashClosed: () => void;
}

const CashClosingForm = ({ cashSession, onCashClosed }: CashClosingFormProps) => {
  const [closingCash, setClosingCash] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);

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
    if (diff > 0) return 'var(--ms-green)';
    if (diff < 0) return 'var(--ms-red)';
    return 'var(--ms-text-muted)';
  };

  const getDifferenceText = () => {
    const diff = calculateDifference();
    if (diff > 0) return `Sobrante: $${diff.toLocaleString('es-CL')}`;
    if (diff < 0) return `Faltante: $${Math.abs(diff).toLocaleString('es-CL')}`;
    return 'Cuadra exacto';
  };

  return (
    <div
      style={{
        background: 'var(--ms-bg-raised)',
        border: '1px solid rgba(255,107,107,0.15)',
        borderRadius: 'var(--ms-radius-md)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '0.6rem 0.75rem',
          background: 'var(--ms-red-dim)',
          borderBottom: '1px solid rgba(255,107,107,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <StopCircle size={16} style={{ color: 'var(--ms-red)' }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ms-red)' }}>
          Cierre de Caja
        </span>
      </div>

      <div style={{ padding: '1rem' }}>
        {error && (
          <div style={{
            background: 'var(--ms-red-dim)',
            border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: 'var(--ms-radius-sm)',
            padding: '0.5rem 0.75rem',
            color: 'var(--ms-red)',
            fontSize: '0.85rem',
            marginBottom: '0.75rem'
          }}>
            {error}
          </div>
        )}

        {/* Summary grid */}
        <div className="row g-3 mb-3">
          <div className="col-md-8">
            <div className="row g-2">
              {[
                { label: 'Apertura', value: cashSession.opening_cash, color: 'var(--ms-text-primary)' },
                { label: 'Efectivo', value: cashSession.cash_sales, color: 'var(--ms-green)' },
                { label: 'Tarjeta', value: cashSession.card_sales, color: 'var(--ms-blue)' },
                { label: 'Digital', value: cashSession.digital_sales, color: 'var(--ms-accent-light)' },
                { label: 'Total Ventas', value: cashSession.total_sales, color: 'var(--ms-text-primary)' },
                { label: 'A Rendir', value: cashSession.cash_to_render, color: 'var(--ms-amber)' }
              ].map((item, i) => (
                <div key={i} className="col-4">
                  <div style={{
                    background: 'var(--ms-bg-surface)',
                    borderRadius: 'var(--ms-radius-sm)',
                    padding: '0.5rem 0.6rem',
                    border: '1px solid var(--ms-border)'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--ms-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                      {item.label}
                    </div>
                    <div style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: item.color, fontSize: '0.95rem' }}>
                      ${item.value.toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-4">
            <form onSubmit={handleSubmit}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                color: 'var(--ms-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: 'Outfit, sans-serif',
                marginBottom: '0.35rem'
              }}>
                Efectivo real en caja
              </label>
              <div className="input-group mb-2">
                <span className="input-group-text" style={{ background: 'var(--ms-bg-surface)', border: '1px solid var(--ms-border)', color: 'var(--ms-text-muted)' }}>$</span>
                <input
                  type="number"
                  className="form-control"
                  value={closingCash}
                  onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="100"
                  placeholder="0"
                  required
                  disabled={isLoading}
                  style={{
                    background: 'var(--ms-bg-surface)',
                    border: '1px solid var(--ms-border)',
                    color: 'var(--ms-text-primary)'
                  }}
                />
              </div>

              {closingCash > 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '0.4rem',
                  background: 'var(--ms-bg-surface)',
                  borderRadius: 'var(--ms-radius-sm)',
                  marginBottom: '0.5rem',
                  border: '1px solid var(--ms-border)'
                }}>
                  <div style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: getDifferenceColor(), fontSize: '0.9rem' }}>
                    {getDifferenceText()}
                  </div>
                </div>
              )}

              {!confirmed ? (
                <button
                  type="button"
                  className="btn w-100"
                  onClick={() => setConfirmed(true)}
                  style={{
                    background: 'var(--ms-red-dim)',
                    color: 'var(--ms-red)',
                    border: '1px solid rgba(255,107,107,0.3)',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Cerrar Caja
                </button>
              ) : (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn flex-grow-1"
                    onClick={() => setConfirmed(false)}
                    disabled={isLoading}
                    style={{
                      background: 'var(--ms-bg-surface)',
                      color: 'var(--ms-text-muted)',
                      border: '1px solid var(--ms-border)',
                      fontSize: '0.82rem'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn flex-grow-1"
                    disabled={isLoading}
                    style={{
                      background: 'var(--ms-red)',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.82rem'
                    }}
                  >
                    {isLoading ? 'Cerrando...' : 'Confirmar Cierre'}
                  </button>
                </div>
              )}
            </form>

            <div style={{
              marginTop: '0.5rem',
              padding: '0.4rem 0.5rem',
              background: 'var(--ms-amber-dim)',
              borderRadius: 'var(--ms-radius-sm)',
              border: '1px solid rgba(253,203,110,0.15)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.35rem'
            }}>
              <AlertTriangle size={12} style={{ color: 'var(--ms-amber)', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ color: 'var(--ms-amber)', fontSize: '0.65rem', lineHeight: 1.3 }}>
                Una vez cerrada, no podras registrar mas ventas del dia.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashClosingForm;
