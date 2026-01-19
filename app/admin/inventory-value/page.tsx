'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import InventorySummary from '@/components/InventorySummary';
import CostUpdateForm from '@/components/CostUpdateForm';
import ProductCostList from '@/components/ProductCostList';

const InventoryValuePage = () => {
    // Shared state for brand filtering, default to MOVAL
    const [selectedBrand, setSelectedBrand] = useState<string>('MOVAL');

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
