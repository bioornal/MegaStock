'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, Product } from '@/services/productService';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface InventorySummaryProps {
    products?: Product[];
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ products: initialProducts }) => {
    const [products, setProducts] = useState<Product[]>(initialProducts || []);
    const [isLoading, setIsLoading] = useState(!initialProducts);

    useEffect(() => {
        if (!initialProducts) {
            loadProducts();
        }
    }, [initialProducts]);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error al cargar productos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const { totalCost, costByBrand } = useMemo(() => {
        const totalCost = products.reduce((acc, product) => acc + ((product.cost || 0) * product.stock), 0);
        const costByBrand = products.reduce((acc, product) => {
            const brand = product.brand || 'Sin Marca';
            const cost = (product.cost || 0) * product.stock;
            acc[brand] = (acc[brand] || 0) + cost;
            return acc;
        }, {} as Record<string, number>);
        return { totalCost, costByBrand };
    }, [products]);

    if (isLoading) {
        return <div className="p-4 text-center">Cargando resumen...</div>;
    }

    return (
        <div className="card shadow-sm border-0 mb-4 bg-white">
            <div className="card-header bg-success text-white">
                <h5 className="mb-0">💰 Resumen de Valor de Inventario</h5>
            </div>
            <div className="card-body">
                <div className="row g-4">
                    <div className="col-md-5 col-lg-4">
                        <div className="bg-light p-4 rounded border h-100 text-center d-flex flex-column justify-content-center">
                            <h6 className="text-secondary mb-3">VALOR TOTAL (Costo × Stock)</h6>
                            <h1 className="text-success display-6 fw-bold mb-0">
                                ${totalCost.toLocaleString('es-CL')}
                            </h1>
                            <p className="text-muted mt-3 small">
                                Basado en {products.length} productos registrados
                            </p>
                        </div>
                    </div>
                    <div className="col-md-7 col-lg-8">
                        <div className="h-100 d-flex flex-column">
                            <h6 className="text-secondary mb-3 pb-2 border-bottom">Desglose por Marca</h6>
                            <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '300px' }}>
                                <div className="row g-3">
                                    {Object.entries(costByBrand)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([brand, total]) => (
                                            <div key={brand} className="col-sm-6 col-lg-4">
                                                <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light border-start border-4 border-success h-100">
                                                    <span className="fw-medium text-truncate me-2" title={brand}>{brand}</span>
                                                    <span className="fw-bold text-nowrap">${total.toLocaleString('es-CL')}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventorySummary;
