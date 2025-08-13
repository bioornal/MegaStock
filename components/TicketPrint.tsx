"use client";

import { useEffect, useRef } from 'react';
import { TicketData } from '@/services/customerService';
import { Printer, X } from 'lucide-react';

interface TicketPrintProps {
  ticketData: TicketData;
  onClose: () => void;
  onPrint: () => void;
}

const TicketPrint = ({ ticketData, onClose, onPrint }: TicketPrintProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  // Función para imprimir solo el ticket
  const handlePrint = () => {
    const ticketContent = ticketRef.current;
    if (!ticketContent) return;

    // Crear una nueva ventana para imprimir solo el ticket
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Escribir el contenido del ticket en la nueva ventana
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${ticketData.ticket_number}</title>
          <style>
            body {
              margin: 0;
              padding: 10px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.3;
              color: black;
              background: white;
              font-weight: bold;
            }
            .ticket {
              width: 80mm;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-end { text-align: right; }
            .fw-bold { font-weight: 900; }
            .text-normal { font-weight: bold; }
            .text-large { font-size: 14px; font-weight: 900; }
            .text-medium { font-size: 13px; font-weight: bold; }
            .mb-1 { margin-bottom: 2px; }
            .mb-2 { margin-bottom: 4px; }
            .mb-3 { margin-bottom: 6px; }
            .row { display: flex; justify-content: space-between; }
            .col-6 { width: 48%; }
            .col-8 { width: 65%; }
            .col-4 { width: 32%; }
            .border-top { border-top: 1px dashed #000; margin: 10px 0; }
            @media print {
              body { margin: 0; padding: 0; }
              .ticket { width: 100%; }
            }
          </style>
        </head>
        <body>
          ${ticketContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Esperar a que cargue y luego imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onPrint();
    }, 250);
  };



  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number') {
      return '0,00';
    }
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Obtener letra de factura según tipo de cliente
  const getInvoiceLetter = (customerType: string) => {
    switch (customerType) {
      case 'responsable_inscripto': return 'A';
      case 'monotributista': return 'B';
      case 'consumidor_final': return 'X';
      default: return 'X';
    }
  };



  return (
    <>
      {/* Modal para vista previa */}
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Vista Previa del Ticket</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body p-0">
              <div className="d-flex justify-content-center p-3 bg-light">
                <button className="btn btn-primary me-2" onClick={handlePrint}>
                  <Printer size={16} className="me-1" />
                  Imprimir Ticket
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  <X size={16} className="me-1" />
                  Cerrar
                </button>
              </div>
              
              {/* Ticket */}
              <div className="ticket-container" style={{ backgroundColor: '#f8f9fa', padding: '20px' }}>
                <div ref={ticketRef} className="ticket" id="ticket-to-print">
                  <div className="ticket-content">
                    {/* Encabezado de la empresa */}
                    <div className="text-center mb-3">
                      <h4 className="mb-1" style={{ fontSize: '18px', fontWeight: '900' }}>
                        Mega Muebles
                      </h4>
                      <p className="mb-1" style={{ fontSize: '14px', margin: '0', fontWeight: 'bold' }}>
                        Especialidades SRL
                      </p>
                      <p className="mb-1" style={{ fontSize: '12px', margin: '0', fontWeight: 'bold' }}>
                        CUIT: 30716690901
                      </p>
                      <p className="mb-1" style={{ fontSize: '12px', margin: '0', fontWeight: 'bold' }}>
                        IB: 
                      </p>
                      <p className="mb-2" style={{ fontSize: '12px', margin: '0', fontWeight: 'bold' }}>
                        Inicio de Act.: 01/01/1990
                      </p>
                    </div>

                    {/* Línea separadora */}
                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

                    {/* Información fiscal */}
                    <div className="text-center mb-2">
                      <p style={{ fontSize: '12px', margin: '0', fontWeight: 'bold' }}>
                        Iva Responsable Inscripto
                      </p>
                    </div>

                    {/* Información de la factura */}
                    <div className="mb-2">
                      <div className="row" style={{ fontSize: '13px', fontWeight: '900' }}>
                        <div className="col-6">
                          <strong>FACTURA {getInvoiceLetter(ticketData.customer.customer_type)}</strong>
                        </div>
                        <div className="col-6 text-end">
                          <strong>NRO. {ticketData.ticket_number}</strong>
                        </div>
                      </div>
                      <div className="row" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        <div className="col-6">
                          <strong>CODIGO N° 01</strong>
                        </div>
                        <div className="col-6 text-end">
                          <strong>Fecha: {formatDate(ticketData.created_at)}</strong>
                        </div>
                      </div>
                      <div className="row" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        <div className="col-6">
                          <strong>ORIGINAL</strong>
                        </div>
                        <div className="col-6 text-end">
                          <strong>Hora: {formatTime(ticketData.created_at)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Línea separadora */}
                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

                    {/* Datos del cliente */}
                    <div className="mb-2" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {ticketData.customer && ticketData.customer.id ? (
                        <>
                          <p className="mb-1" style={{ fontWeight: 'bold' }}>
                            <strong>{ticketData.customer.name}</strong>
                          </p>
                          <p className="mb-1" style={{ fontWeight: 'bold' }}>
                            <strong>Dir.: {ticketData.customer.address || 'Sin dirección'}</strong>
                          </p>
                          <p className="mb-1" style={{ fontWeight: 'bold' }}>
                            <strong>Loc.: {ticketData.customer.city || 'Sin localidad'}</strong>
                          </p>

                          <p className="mb-1" style={{ fontWeight: 'bold' }}>
                            <strong>CUIT: {ticketData.customer.cuit_dni || ''}</strong>
                          </p>
                          {ticketData.customer.customer_type === 'responsable_inscripto' && (
                            <p className="mb-1" style={{ fontWeight: 'bold' }}>
                              <strong>IVA Responsable Inscripto</strong>
                            </p>
                          )}
                          {ticketData.customer.business_name && (
                            <p className="mb-1" style={{ fontWeight: 'bold' }}>
                              <strong>Razón Social: {ticketData.customer.business_name}</strong>
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="mb-1" style={{ fontWeight: 'normal' }}></p>
                          <p className="mb-1" style={{ fontWeight: 'normal' }}>Dir.: </p>
                          <p className="mb-1" style={{ fontWeight: 'normal' }}>Loc.: </p>

                          <p className="mb-1" style={{ fontWeight: 'normal' }}>CUIT: </p>
                          <p className="mb-1" style={{ fontWeight: 'normal' }}>IVA Responsable Inscripto</p>
                        </>
                      )}
                    </div>

                    {/* Línea separadora */}
                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

                    {/* Productos */}
                    <div className="mb-2">
                      {ticketData.sale_items.map((item, index) => {


                        return (
                          <div key={index} className="mb-2">
                            <div style={{ fontSize: '13px', fontWeight: '900' }}>
                              <strong>{item.product_name}</strong>
                            </div>
                            <div className="row" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              <div className="col-8">
                                <strong>{item.quantity} x {formatCurrency(item.unit_price_without_iva)}</strong>
                              </div>
                              <div className="col-4 text-end">
                                <strong>{formatCurrency(item.subtotal_without_iva)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Línea separadora */}
                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

                    {/* Totales */}
                    <div className="mb-2" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      <div className="row">
                        <div className="col-6"><strong>Subtotal</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>{formatCurrency(ticketData.subtotal)}</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-6"><strong>IVA 21%:</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>{formatCurrency(ticketData.iva_amount)}</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-6"><strong>IVA 10,5%:</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>0,00</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-6"><strong>Rec.</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>0,00</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-6"><strong>Desc.</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>0,00</strong></div>
                      </div>
                      <div className="row">
                        <div className="col-6"><strong>Percep.</strong></div>
                        <div className="col-2"><strong>$</strong></div>
                        <div className="col-4 text-end"><strong>0,00</strong></div>
                      </div>
                    </div>

                    {/* Línea separadora */}
                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

                    {/* Total final */}
                    <div className="text-center mb-3" style={{ fontSize: '16px', fontWeight: '900' }}>
                      <strong>TOTAL $ {formatCurrency(ticketData.total)}</strong>
                    </div>

                    {/* Información adicional */}
                    <div className="text-center" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      <p className="mb-1"><strong>CAE 75313500689391 Vto. 10/8/2025</strong></p>
                      <p className="mb-1">
                        <strong>ARCA</strong>
                      </p>
                      <p className="mb-1"><strong>Comprobante Autorizado</strong></p>
                      <p className="mb-1"><strong>Comprobante generado por www.AdmGlobal.com.ar</strong></p>
                      <p className="mb-2" style={{ fontSize: '12px', fontWeight: '900' }}>
                        <strong>Gracias por su compra!</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para el ticket */}
      <style jsx>{`
        .ticket {
          width: 80mm;
          margin: 0 auto;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.3;
          color: black;
          background: white;
          padding: 10px;
          border: 1px solid #ddd;
          font-weight: bold;
        }
        
        .ticket-content {
          width: 100%;
        }
      `}</style>
    </>
  );
};

export default TicketPrint;
