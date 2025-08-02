"use client";

import { useState, useEffect } from 'react';
import { Customer, createCustomer, findCustomerByCuitDni, getDefaultCustomer, searchCustomers } from '@/services/customerService';
import { User, Search, Plus, FileText } from 'lucide-react';

interface CustomerFormProps {
  onCustomerSelected: (customer: Customer) => void;
  onClose: () => void;
  isRequired?: boolean;
}

const CustomerForm = ({ onCustomerSelected, onClose, isRequired = false }: CustomerFormProps) => {
  const [customer, setCustomer] = useState<Partial<Customer>>({
    name: '',
    business_name: '',
    address: '',
    city: '',
    province: '',
    cuit_dni: '',
    email: '',
    phone: '',
    customer_type: 'consumidor_final'
  });
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchCuit, setSearchCuit] = useState<string>('');

  // Buscar cliente por CUIT/DNI o nombre
  const handleSearchCustomer = async () => {
    if (!searchCuit.trim()) return;
    
    setIsLoading(true);
    setError('');
    setSearchResults([]);
    setShowSearchResults(false);
    
    try {
      // Primero buscar por CUIT/DNI exacto
      const foundCustomer = await findCustomerByCuitDni(searchCuit.trim());
      if (foundCustomer) {
        setCustomer(foundCustomer);
        return;
      }
      
      // Si no se encuentra por CUIT, buscar por nombre o razón social
      const searchResults = await searchCustomers(searchCuit.trim());
      if (searchResults.length > 0) {
        if (searchResults.length === 1) {
          setCustomer(searchResults[0]);
        } else {
          setSearchResults(searchResults);
          setShowSearchResults(true);
        }
      } else {
        setError('No se encontró cliente con esos datos');
        setCustomer({ ...customer, cuit_dni: searchCuit.trim() });
      }
    } catch (error: any) {
      setError(error.message || 'Error buscando cliente');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Seleccionar cliente de los resultados de búsqueda
  const handleSelectSearchResult = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Usar consumidor final por defecto
  const handleUseDefaultCustomer = async () => {
    setIsLoading(true);
    try {
      const defaultCustomer = await getDefaultCustomer();
      onCustomerSelected(defaultCustomer);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error obteniendo cliente por defecto');
    } finally {
      setIsLoading(false);
    }
  };

  // Crear o actualizar cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer.name?.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const customerData = {
        name: customer.name.trim(),
        address: customer.address?.trim() || '',
        cuit_dni: customer.cuit_dni?.trim() || '',
        email: customer.email?.trim() || '',
        phone: customer.phone?.trim() || '',
        customer_type: customer.customer_type || 'consumidor_final'
      };

      const newCustomer = await createCustomer(customerData);
      onCustomerSelected(newCustomer);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Error guardando cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title d-flex align-items-center">
              <User size={20} className="me-2" />
              Datos del Cliente para Ticket
            </h5>
            {!isRequired && (
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            )}
          </div>

          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {/* Búsqueda rápida por CUIT/DNI */}
            <div className="mb-4 p-3 bg-light rounded">
              <h6 className="mb-3">
                <Search size={16} className="me-2" />
                Buscar Cliente Existente
              </h6>
              <div className="row">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ingrese CUIT o DNI"
                    value={searchCuit}
                    onChange={(e) => setSearchCuit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                  />
                </div>
                <div className="col-md-4">
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100"
                    onClick={handleSearchCustomer}
                    disabled={isLoading || !searchCuit.trim()}
                  >
                    <Search size={16} className="me-1" />
                    Buscar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="mb-4 p-3 bg-info bg-opacity-10 rounded border border-info">
                <h6 className="mb-3 text-info">Se encontraron {searchResults.length} clientes:</h6>
                <div className="list-group">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{result.name}</h6>
                        <small>{result.cuit_dni}</small>
                      </div>
                      {result.business_name && (
                        <p className="mb-1 text-muted">Razón Social: {result.business_name}</p>
                      )}
                      {result.address && (
                        <small className="text-muted">Dirección: {result.address}</small>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customer.name || ''}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    required
                    placeholder="Nombre y apellido"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Razón Social</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customer.business_name || ''}
                    onChange={(e) => setCustomer({ ...customer, business_name: e.target.value })}
                    placeholder="Solo para empresas"
                  />
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">CUIT / DNI</label>
                  <input
                    type="text"
                    className="form-control"
                    maxLength={30}
                    value={customer.cuit_dni || ''}
                    onChange={(e) => setCustomer({ ...customer, cuit_dni: e.target.value })}
                    placeholder="20-12345678-9 o 12345678"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Dirección (Calle y Número)</label>
                <input
                  type="text"
                  className="form-control"
                  value={customer.address || ''}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Ej: Justo Paez Molina 259"
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Ciudad/Localidad</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customer.city || ''}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    placeholder="Ej: La Cumbre"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Provincia</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customer.province || ''}
                    onChange={(e) => setCustomer({ ...customer, province: e.target.value })}
                    placeholder="Ej: Córdoba"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={customer.email || ''}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Tipo de Cliente</label>
                <select
                  className="form-select"
                  value={customer.customer_type || 'consumidor_final'}
                  onChange={(e) => setCustomer({ ...customer, customer_type: e.target.value as Customer['customer_type'] })}
                >
                  <option value="consumidor_final">Consumidor Final</option>
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributista">Monotributista</option>
                </select>
              </div>

              <div className="modal-footer">
                {!isRequired && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleUseDefaultCustomer}
                    disabled={isLoading}
                  >
                    <FileText size={16} className="me-1" />
                    Consumidor Final
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={isLoading || !customer.name?.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="me-1" />
                      Usar Este Cliente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
