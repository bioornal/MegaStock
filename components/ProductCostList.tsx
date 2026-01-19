'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, Product } from '@/services/productService';
import { BRANDS } from '@/lib/productOptions'; // Assuming BRANDS is exported from here based on previous file reads
import { Search, Filter } from 'lucide-react';

interface ProductCostListProps {
    externalSelectedBrand?: string;
    onBrandChange?: (brand: string) => void;
}

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

    // Helper para normalizar strings (ignorar tildes y mayúsculas)
    const normalizeText = (text: string | undefined | null): string => {
        if (!text) return '';
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    };

    const filteredProducts = useMemo(() => {
        // Si no hay marca seleccionada (aunque por defecto vendrá una), mostrar vacío o todo? 
        // El usuario dijo "no quiero que se vean todos... ya debe venir filtrado por Moval".
        // Así que si selectedBrand es vacío, podríamos devolver vacío o todo. 
        // Pero como setearemos el default en el padre, aquí solo filtramos.
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
                            <th className="text-end">Costo Unit.</th>
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
                                    <td className="text-center">{product.stock}</td>
                                    <td className="text-end text-muted">${cost.toLocaleString('es-CL')}</td>
                                    <td className="text-end fw-medium">${subtotal.toLocaleString('es-CL')}</td>
                                </tr>
                            );
                        })}
                        {/* Fila de Totales si hay filtro activo o siempre? Mejor siempre al final de la tabla filtrada */}
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
                <div className="p-4 text-center text-muted">No se encontraron productos.</div>
            )}
        </div>
    );
};

export default ProductCostList;
