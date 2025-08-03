"use client";

import { useState, useEffect } from 'react';
import { Customer, createCustomer, updateCustomer, findCustomerByCuitDni, getDefaultCustomer, searchCustomers } from '@/services/customerService';
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
    city: 'La Falda',
    cuit_dni: '',
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
        business_name: customer.business_name?.trim() || '',
        address: customer.address?.trim() || '',
        city: customer.city?.trim() || 'La Falda',
        province: '',
        cuit_dni: customer.cuit_dni?.trim() || '',
        email: '',
        phone: customer.phone?.trim() || '',
        customer_type: customer.customer_type || 'consumidor_final'
      };

      let resultCustomer: Customer;
      
      // Si el cliente tiene ID, es un cliente existente -> ACTUALIZAR
      if (customer.id) {
        console.log('Actualizando cliente existente ID:', customer.id);
        resultCustomer = await updateCustomer(customer.id, customerData);
      } else {
        // Si no tiene ID, es un cliente nuevo -> CREAR
        console.log('Creando nuevo cliente');
        resultCustomer = await createCustomer(customerData);
      }
      
      onCustomerSelected(resultCustomer);
      onClose();
    } catch (error: any) {
      console.error('Error en handleSubmit:', error);
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
            <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded border border-primary-subtle">
              <h6 className="mb-3 text-primary">
                <Search size={16} className="me-2" />
                Buscar Cliente Existente
              </h6>
              <div className="row">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ingrese CUIT, DNI o Nombre"
                    value={searchCuit}
                    onChange={(e) => setSearchCuit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchCustomer()}
                  />
                </div>
                <div className="col-md-4">
                  <button
                    type="button"
                    className="btn btn-primary w-100"
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
              <div className="mb-4 p-3 bg-info bg-opacity-10 rounded border border-info-subtle">
                <h6 className="mb-3 text-info">Se encontraron {searchResults.length} clientes. Seleccione uno:</h6>
                <div className="list-group">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="list-group-item list-group-item-action list-group-item-info"
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
              <h6 className="mb-3 mt-4"><Plus size={16} className="me-2" />Crear o Modificar Cliente</h6>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="name" className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    value={customer.name || ''}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="business_name" className="form-label">Razón Social</label>
                  <input
                    type="text"
                    className="form-control"
                    id="business_name"
                    value={customer.business_name || ''}
                    onChange={(e) => setCustomer({ ...customer, business_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="address" className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-control"
                    id="address"
                    value={customer.address || ''}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="city" className="form-label">Localidad</label>
                  <select
                    className="form-select"
                    id="city"
                    value={customer.city || 'La Falda'}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  >
                    <option value="Capilla del Monte">Capilla del Monte</option>
                    <option value="Cosquín">Cosquín</option>
                    <option value="Cruz del Eje">Cruz del Eje</option>
                    <option value="Huerta Grande">Huerta Grande</option>
                    <option value="La Cumbre">La Cumbre</option>
                    <option value="La Falda">La Falda</option>
                    <option value="Valle Hermoso">Valle Hermoso</option>
                    <option value="Villa Giardino">Villa Giardino</option>
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-4">
                  <label htmlFor="cuit" className="form-label">CUIT / DNI</label>
                  <input
                    type="text"
                    className="form-control"
                    id="cuit"
                    value={customer.cuit_dni || ''}
                    onChange={(e) => setCustomer({ ...customer, cuit_dni: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="phone" className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className="form-control"
                    id="phone"
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="customer_type" className="form-label">Tipo Cliente</label>
                  <select
                    className="form-select"
                    id="customer_type"
                    value={customer.customer_type || 'consumidor_final'}
                    onChange={(e) => setCustomer({ ...customer, customer_type: e.target.value as Customer['customer_type'] })}
                  >
                    <option value="consumidor_final">Consumidor Final</option>
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="monotributista">Monotributista</option>
                  </select>
                </div>
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
