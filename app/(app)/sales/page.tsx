"use client";

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { useState, useEffect } from 'react';
import { getActiveVendors, Vendor } from '@/services/vendorService';
import VendorDashboard from '@/components/VendorDashboard';
import { ShoppingCart } from 'lucide-react';

const SalesPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await getActiveVendors();
        setVendors(data);
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
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border" style={{ color: 'var(--ms-accent)' }} role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div
          className="text-center"
          style={{
            background: 'var(--ms-bg-raised)',
            border: '1px solid var(--ms-border)',
            borderRadius: 'var(--ms-radius-lg)',
            padding: '3rem',
            maxWidth: '400px'
          }}
        >
          <ShoppingCart size={40} style={{ color: 'var(--ms-text-muted)', marginBottom: '1rem' }} />
          <h5 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, marginBottom: '0.5rem' }}>
            Sin vendedores
          </h5>
          <p style={{ color: 'var(--ms-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Contacta al administrador para registrar vendedores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 px-1">
      {selectedVendor && (
        <VendorDashboard vendor={selectedVendor} />
      )}
    </div>
  );
};

export default SalesPage;
