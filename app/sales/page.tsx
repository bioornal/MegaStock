"use client";

import { useState, useEffect } from 'react';
import { getActiveVendors, Vendor } from '@/services/vendorService';
import VendorDashboard from '@/components/VendorDashboard';
import { Users, ShoppingCart } from 'lucide-react';

const SalesPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await getActiveVendors();
        setVendors(data);
        // Seleccionar primer vendedor por defecto
        if (data.length > 0) {
          setSelectedVendor(data[0]);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <Users size={48} className="text-muted mb-3" />
                <h5>No hay vendedores registrados</h5>
                <p className="text-muted">Contacta al administrador para registrar vendedores.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0 d-flex align-items-center">
                <ShoppingCart size={24} className="me-2" />
                Sistema de Ventas - Gestión de Caja
              </h3>
            </div>
            <div className="card-body">
              {/* Selector de vendedor */}
              <div className="row mb-4">
                <div className="col-md-4">
                  <label className="form-label fw-bold">Seleccionar Vendedor:</label>
                  <select 
                    className="form-select"
                    value={selectedVendor?.id || ''}
                    onChange={(e) => {
                      const vendor = vendors.find(v => v.id === parseInt(e.target.value));
                      setSelectedVendor(vendor || null);
                    }}
                  >
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dashboard del vendedor seleccionado */}
              {selectedVendor && (
                <VendorDashboard vendor={selectedVendor} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
