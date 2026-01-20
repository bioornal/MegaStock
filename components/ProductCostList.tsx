'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts, updateProduct, Product } from '@/services/productService';
import { BRANDS } from '@/lib/productOptions';
import { Search, Filter, Edit2, Check, X } from 'lucide-react';

interface ProductCostListProps {
    externalSelectedBrand?: string;
    onBrandChange?: (brand: string) => void;
}

// Componente auxiliar para celda editable
const EditableCostCell = ({ product, onUpdate }: { product: Product, onUpdate: (id: number, newCost: number) => Promise<void> }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [cost, setCost] = useState(product.cost || 0);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCost(product.cost || 0);
    }, [product.cost]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (cost === (product.cost || 0)) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        try {
            await onUpdate(product.id, cost);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Error al guardar el costo');
            setCost(product.cost || 0); // Revertir
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setCost(product.cost || 0);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="d-flex align-items-center justify-content-end gap-1">
                <input
                    ref={inputRef}
                    type="number"
                    className="form-control form-control-sm text-end p-0 px-1"
                    style={{ width: '80px', height: '24px' }}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={saving}
                />
                {saving && <span className="spinner-border spinner-border-sm text-primary" style={{ width: '0.8rem', height: '0.8rem' }} />}
            </div>
        );
    }

    return (
        <div
            className="d-flex align-items-center justify-content-end cursor-pointer group-hover-visible"
            onClick={() => setIsEditing(true)}
            title="Clic para editar"
            style={{ cursor: 'pointer' }}
        >
            <span className={cost === 0 ? 'text-danger fw-bold' : 'text-muted'}>
                ${cost.toLocaleString('es-CL')}
            </span>
            <Edit2 className="ms-2 text-muted opacity-0 group-hover-opacity" size={12} />
        </div>
    );
};

const ProductCostList: React.FC<ProductCostListProps> = ({ externalSelectedBrand, onBrandChange }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const selectedBrand = externalSelectedBrand || '';

    useEffect(() => {
        loadProducts();
    }, []);

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

    const handleCostUpdate = async (productId: number, newCost: number) => {
        // Actualizar en DB
        await updateProduct(productId, { cost: newCost });

        // Actualizar estado local
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, cost: newCost } : p
        ));
    };

    // Helper para normalizar strings (ignorar tildes y mayúsculas)
    const normalizeText = (text: string | undefined | null): string => {
        if (!text) return '';
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    };

    const filteredProducts = useMemo(() => {
        if (!selectedBrand) return products;
        return products.filter(product => normalizeText(product.brand) === normalizeText(selectedBrand));
    }, [products, selectedBrand]);

    // Totales de la selección actual
    const currentTotalStock = filteredProducts.reduce((acc, p) => acc + p.stock, 0);
    const currentTotalValue = filteredProducts.reduce((acc, p) => acc + ((p.cost || 0) * p.stock), 0);

    if (isLoading) {
        return <div className="p-4 text-center">Cargando lista...</div>;
    }

    return (
        <div className="card shadow-sm border-0 mb-4">
            <style jsx global>{`
                .group-hover-opacity { opacity: 0; transition: opacity 0.2s; }
                tr:hover .group-hover-opacity { opacity: 0.5; }
                tr:hover .group-hover-opacity:hover { opacity: 1; }
            `}</style>
            <div className="card-header bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark">📋 Detalle de Costos por Producto</h5>
                    <span className="badge bg-light text-dark border">
                        {filteredProducts.length} productos
                    </span>
                </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '500px' }}>
                <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="table-light sticky-top">
                        <tr>
                            <th>Producto</th>
                            <th>Marca</th>
                            <th className="text-center">Stock</th>
                            <th className="text-end" style={{ minWidth: '120px' }}>Costo Unit. ✏️</th>
                            <th className="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => {
                            const cost = product.cost || 0;
                            const subtotal = cost * product.stock;
                            return (
                                <tr key={product.id}>
                                    <td className="text-truncate" style={{ maxWidth: '250px' }} title={product.name}>{product.name}</td>
                                    <td className="text-muted small">{product.brand}</td>
                                    <td className="text-center align-middle">{product.stock}</td>
                                    <td className="text-end align-middle">
                                        <EditableCostCell product={product} onUpdate={handleCostUpdate} />
                                    </td>
                                    <td className="text-end fw-medium align-middle">${subtotal.toLocaleString('es-CL')}</td>
                                </tr>
                            );
                        })}
                        {filteredProducts.length > 0 && (
                            <tr className="table-secondary fw-bold">
                                <td colSpan={2} className="text-end">TOTALES</td>
                                <td className="text-center">{currentTotalStock}</td>
                                <td className="text-end">-</td>
                                <td className="text-end">${currentTotalValue.toLocaleString('es-CL')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-muted">No se encontraron productos probables para esta marca.</div>
            )}
        </div>
    );
};

export default ProductCostList;
