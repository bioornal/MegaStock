'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import InventorySummary from '@/components/InventorySummary';
import CostUpdateForm from '@/components/CostUpdateForm';
import ProductCostList from '@/components/ProductCostList';

const HARDCODED_PASSWORD = '1106';

const InventoryValuePage = () => {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Shared state for brand filtering, default to MOVAL
    const [selectedBrand, setSelectedBrand] = useState<string>('MOVAL');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === HARDCODED_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Contraseña incorrecta');
        }
    };

    // Show password form if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-md-4">
                        <div className="card shadow-sm border-0">
                            <div className="card-body p-4">
                                <div className="text-center mb-4">
                                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                        <Lock size={28} className="text-primary" />
                                    </div>
                                    <h4 className="fw-bold text-dark mb-1">Acceso Restringido</h4>
                                    <p className="text-muted small mb-0">Ingrese la contraseña para continuar</p>
                                </div>
                                <form onSubmit={handleLogin}>
                                    <div className="mb-3">
                                        <input
                                            type="password"
                                            className={`form-control form-control-lg text-center ${error ? 'is-invalid' : ''}`}
                                            placeholder="Contraseña"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError('');
                                            }}
                                            autoFocus
                                        />
                                        {error && <div className="invalid-feedback text-center">{error}</div>}
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100 py-2">
                                        Ingresar
                                    </button>
                                </form>
                                <div className="mt-3 text-center">
                                    <Link href="/" className="text-muted small text-decoration-none">
                                        ← Volver al inicio
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="mb-4 d-flex align-items-center gap-3">
                <Link href="/" className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="m-0 fw-bold text-dark">Gestión de Costos de Inventario</h2>
            </div>

            <div className="row g-4">
                {/* Import Tool - Moved to Top */}
                <div className="col-12">
                    <CostUpdateForm />
                </div>

                {/* Resumen superior - Now actionable */}
                <div className="col-12">
                    <InventorySummary
                        selectedBrand={selectedBrand}
                        onBrandClick={setSelectedBrand}
                    />
                </div>

                {/* Detailed List */}
                <div className="col-12">
                    <ProductCostList
                        externalSelectedBrand={selectedBrand}
                        onBrandChange={setSelectedBrand}
                    />
                </div>
            </div>
        </div>
    );
};

export default InventoryValuePage;
