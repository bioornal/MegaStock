'use client';

import React, { useState, useEffect } from 'react';
import { getProducts, bulkUpdateCosts, updateProduct, Product, findProductsByNameAndBrand } from '@/services/productService';
import { fetchGoogleSheetCsv, parseCsv, SheetPriceEntry, smartParseInt } from '@/lib/sheets';

interface CostUpdate {
    productId: number;
    productName: string;
    currentCost: number;
    newCost: number;
    brand: string;
    selected: boolean;
    manuallyModified: boolean;
}

// Componente para cada fila de producto no encontrado
// Permite buscar el producto en la DB y asignar el costo
interface NotFoundRowProps {
    entry: SheetPriceEntry;
    products: Product[];
    onUpdate: (productName: string, cost: number) => void;
}

const NotFoundRow: React.FC<NotFoundRowProps> = ({ entry, products, onUpdate }) => {
    const [editableCost, setEditableCost] = useState(entry.price);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);

    // Lógica de búsqueda
    const normalizeForSearch = (s: string) =>
        (s ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const filteredProducts = searchTerm.length >= 2
        ? products.filter(p => {
            const normalizedName = normalizeForSearch(p.name);
            const normalizedSearch = normalizeForSearch(searchTerm);
            const searchTokens = normalizedSearch.split(' ').filter(Boolean);
            return searchTokens.every(token => normalizedName.includes(token));
        }).slice(0, 10)
        : [];

    const handleSelectProduct = (p: Product) => {
        setSelectedProduct(p);
        setSearchTerm(p.name);
        setShowDropdown(false);
    };

    const handleSave = async (rename: boolean) => {
        if (!selectedProduct) {
            alert('Debes buscar y seleccionar un producto de la base de datos primero.');
            return;
        }

        setSaving(true);
        try {
            if (rename) {
                // Actualizar Nombre y Costo
                // Importamos updateProduct dinámicamente o lo pasamos como prop, 
                // pero como estamos en el mismo archivo del parent donde se importa, 
                // mejor usar la función que ya tenemos importada arriba si es posible.
                // Sin embargo, updateProduct no esta importada en el componente.
                // Asumiremos que se agrega a imports.
                await updateProduct(selectedProduct.id, {
                    name: entry.name, // Renombrar al nombre de la planilla
                    cost: editableCost
                });
                alert(`Producto renombrado a "${entry.name}" y costo actualizado.`);
            } else {
                // Solo costo
                await bulkUpdateCosts([{ productId: selectedProduct.id, newCost: editableCost }]);
                // alert(`Costo actualizado para ${entry.name}`); // Feedback más sutil
            }
            onUpdate(entry.name, editableCost);

        } catch (error) {
            console.error('Error actualizando:', error);
            alert('Error al actualizar el producto');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave(false);
        }
    };

    return (
        <tr className={selectedProduct ? 'table-success bg-opacity-25' : ''}>
            <td className="fw-medium text-truncate" style={{ maxWidth: '200px' }} title={entry.name}>
                {entry.name}
            </td>

            {/* Buscador de Producto */}
            <td style={{ minWidth: '250px' }}>
                <div className="position-relative">
                    <input
                        type="text"
                        className={`form-control form-control-sm ${selectedProduct ? 'border-success text-success fw-bold' : ''}`}
                        placeholder="Buscar producto en DB..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(true);
                            setSelectedProduct(null); // Resetear selección al cambiar texto
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {showDropdown && filteredProducts.length > 0 && (
                        <div className="position-absolute bg-white border rounded shadow-sm w-100 mt-1" style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}>
                            {filteredProducts.map(p => (
                                <div
                                    key={p.id}
                                    className="px-2 py-1 cursor-pointer hover-bg-light small border-bottom"
                                    style={{ cursor: 'pointer' }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectProduct(p);
                                    }}
                                >
                                    <div className="fw-medium">{p.name}</div>
                                    <div className="text-muted small">{p.brand} | Actual: ${p.cost?.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </td>

            {/* Input de Costo */}
            <td className="text-end" style={{ width: '120px' }}>
                <input
                    type="number"
                    className="form-control form-control-sm text-end fw-bold"
                    value={editableCost}
                    onChange={(e) => setEditableCost(Number(e.target.value))}
                    onKeyDown={handleKeyDown}
                    disabled={saving}
                />
            </td>

            {/* Acciones */}
            <td style={{ width: '220px' }}>
                <div className="d-flex gap-1 justify-content-end">
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleSave(true)}
                        disabled={saving || !selectedProduct}
                        title="Cambiar el nombre en DB para que coincida con la planilla (Futuras importaciones automáticas)"
                    >
                        {saving ? '...' : '🔗 Renombrar'}
                    </button>
                    <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleSave(false)}
                        disabled={saving || !selectedProduct}
                        title="Solo actualizar costo (Mantener nombre original)"
                    >
                        {saving ? '...' : '💾 Costo'}
                    </button>
                </div>
            </td>
        </tr>
    );
};


const CostUpdateForm: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [updateResults, setUpdateResults] = useState<{ updated: number; errors: any[] } | null>(null);
    const [sheetUrl, setSheetUrl] = useState<string>('');
    const [sheetAnalyzing, setSheetAnalyzing] = useState(false);
    const [sheetUpdates, setSheetUpdates] = useState<CostUpdate[]>([]);
    const [sheetWarnings, setSheetWarnings] = useState<string[]>([]);
    const [sheetNotFound, setSheetNotFound] = useState<SheetPriceEntry[]>([]);
    const [applyAllVariants, setApplyAllVariants] = useState<boolean>(true);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const allProducts = await getProducts();
            setProducts(allProducts);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers compartidos de normalización y tokenización ---
    const normalizeText = (s?: string | null) =>
        (s ?? '')
            .normalize('NFD') // Separa caracteres de sus acentos
            .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    // Stopwords comunes ES/PT
    const STOPWORDS = new Set<string>([
        'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'CON', 'PARA', 'EN', 'AL', 'A', 'POR',
        'DA', 'DO', 'DAS', 'DOS', 'E', 'COM', 'PARA', 'EM', 'AO', 'AOS', 'PRA', 'PRAA',
    ]);

    // Canonizador de sinónimos frecuentes (ES↔PT y plurales)
    const canon = (s?: string | null) => {
        let n = normalizeText(s);

        // Normalizaciones generales
        n = n
            .replace(/\bESCALIPTUS\b/g, 'EUCALIPTUS')
            .replace(/\bEUCALIPTO\b/g, 'EUCALIPTUS')
            .replace(/\bSILLONES\b/g, 'SILLON')
            .replace(/\bSILLAS\b/g, 'SILLA');

        // Sinónimos ES↔PT comunes
        n = n
            .replace(/\bCABECERA\b/g, 'CABECEIRA')
            .replace(/\bCABECERO\b/g, 'CABECEIRA')
            .replace(/\bROPERO\b/g, 'ROUPEIRO')
            .replace(/\bPLACARD\b/g, 'ROUPEIRO')
            .replace(/\bGUARDAROPA\b/g, 'ROUPEIRO')
            .replace(/\bGUARDARROPA\b/g, 'ROUPEIRO')
            .replace(/\bGUARDARROPAS\b/g, 'ROUPEIRO')
            .replace(/\bARMARIO\b/g, 'ROUPEIRO')
            .replace(/\bARMARIOS\b/g, 'ROUPEIRO')
            .replace(/\bMESA DE LUZ\b/g, 'CRIADO MUDO')
            .replace(/\bMESITA DE LUZ\b/g, 'CRIADO MUDO')
            .replace(/\bMESITA LUZ\b/g, 'CRIADO MUDO')
            .replace(/\bMESA LUZ\b/g, 'CRIADO MUDO')
            .replace(/\bTOCADOR\b/g, 'PENTEADEIRA')
            .replace(/\bESPEJO\b/g, '')
            .replace(/\bESPELHO\b/g, '')
            .replace(/\bCON ESPEJO\b/g, '')
            .replace(/\bC\/?\s*ESPEJO\b/g, '')
            .replace(/\bCOM ESPELHO\b/g, '')
            .replace(/\bC\/?\s*ESPELHO\b/g, '')
            .replace(/\bCABECEIRA\s+DE\s+CAMA\b/g, 'CABECEIRA');

        // Normalizar/Eliminar contadores de puertas
        n = n
            .replace(/\b(\d+)\s*(PUERTAS|PUERTA|PTAS|PTS|PORTAS|PORTA|P)\b/g, '$1P')
            .replace(/\b(\d+)P\b/g, '')
            .replace(/\b(\d+)\s*PORTAS?\b/g, '')
            .replace(/\b(\d+)\s*PUERTAS?\b/g, '')
            .replace(/\b(\d+)\s*PTS?\b/g, '')
            .replace(/\b(\d+)\s*PTAS?\b/g, '');

        // Quitar conectores y accesorios poco relevantes
        n = n
            .replace(/\bPES\b/g, '')
            .replace(/\bPATAS\b/g, '')
            .replace(/\bLED\b/g, '')
            .replace(/\+/g, ' ');

        // Compactar espacios
        n = n.replace(/\s+/g, ' ').trim();
        return n;
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    };

    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    };

    // ===== Importación desde Google Sheets: Handlers =====
    const analyzeFromSheet = async () => {
        const currentUrl = sheetUrl.trim();
        if (!currentUrl) {
            alert('Por favor pega un enlace válido de Google Sheets.');
            return;
        }
        try {
            setSheetAnalyzing(true);
            setSheetUrl('');
            setUpdateResults(null);
            setSheetWarnings([]);
            setSheetNotFound([]);

            const csv = await fetchGoogleSheetCsv(currentUrl);

            // DEBUG: Log raw CSV text (first 1000 chars) to see actual structure
            console.log('=== RAW CSV TEXT (primeros 1000 chars) ===');
            console.log(csv.substring(0, 1000));
            console.log('=== FIN RAW CSV ===');

            if (products.length === 0) await loadProducts();

            const prods = products.length > 0 ? products : await getProducts();
            const parsed = parseCsv(csv);
            const headersNorm = parsed.headers.map(h => h.trim());
            const headersLower = headersNorm.map(h => h.toLowerCase());

            // PRODUCTO obligatorio
            const productHeaderCandidates = ['articulo', 'artículo', 'producto', 'descripcion', 'descripción', 'modelo'];
            const productHeaderIdx = headersLower.findIndex(h => productHeaderCandidates.includes(h));

            // COSTO: Buscar "COSTO", "VALOR DE COMPRA", etc.
            const costHeaderCandidates = ['costo', 'cost', 'compra', 'valor compra', 'precio compra', 'costo unitario'];
            const costHeaderIdx = headersLower.findIndex(h => costHeaderCandidates.includes(h));

            // MARCA opcional
            const existingBrands = Array.from(new Set(prods.map(p => normalizeText(p.brand))));
            const brandHeaderIdx = headersNorm.findIndex(h => existingBrands.includes(normalizeText(h)));
            const brandFromHeader = brandHeaderIdx >= 0 ? headersNorm[brandHeaderIdx] : '';

            const warnings: string[] = [];
            if (productHeaderIdx === -1) warnings.push('No se encontró columna de ARTICULO/PRODUCTO en la planilla.');
            if (costHeaderIdx === -1) warnings.push('No se encontró columna de COSTO (Costo/Cost/Compra). No se actualizarán productos.');
            if (brandHeaderIdx === -1) warnings.push('No se detectó la marca por encabezado; se intentará igualar por nombre sin marca.');
            setSheetWarnings(warnings);

            if (productHeaderIdx === -1 || costHeaderIdx === -1) {
                setSheetUpdates([]);
                setSheetAnalyzing(false);
                return;
            }

            const productHeader = headersNorm[productHeaderIdx];
            const costHeader = headersNorm[costHeaderIdx];

            // DEBUG: Log header detection
            console.log('=== CSV PARSING DEBUG ===');
            console.log('Headers encontrados:', headersNorm);
            console.log('Columna de producto:', productHeader, 'idx:', productHeaderIdx);
            console.log('Columna de costo:', costHeader, 'idx:', costHeaderIdx);
            console.log('Marca detectada:', brandFromHeader || '(ninguna)');
            console.log('Total filas en CSV:', parsed.rows.length);

            const entries = parsed.rows.map(r => {
                const name = String(r[productHeader] ?? '').toString().trim();
                const raw = r[costHeader];
                // Usar smartParseInt para manejar correctamente todos los formatos numéricos
                const price = smartParseInt(raw as string | number);
                return {
                    brand: brandFromHeader || '',
                    name,
                    price: Number.isNaN(price) ? 0 : price,
                };
            }).filter(e => e.name && e.price > 0);

            // DEBUG: Log parsed entries with full detail
            console.log('Entries parseados (con nombre y precio > 0):', entries.length);
            if (entries.length > 0) {
                console.log('Primeros 10 entries (nombre completo):', entries.slice(0, 10).map(e => ({ name: e.name, price: e.price })));
            }

            // DEBUG: Log RAW rows from CSV to see actual data
            console.log('=== RAW CSV ROWS (primeras 5) ===');
            if (parsed.rows.length > 0) {
                parsed.rows.slice(0, 5).forEach((r, i) => {
                    console.log(`Fila ${i}:`, {
                        [productHeader]: r[productHeader],
                        [costHeader]: r[costHeader],
                        allKeys: Object.keys(r)
                    });
                });
            }

            const productToUpdate = new Map<number, CostUpdate>();
            const notFound: SheetPriceEntry[] = [];

            // Pre-index por marca y por nombre normalizado
            const productsByBrand = new Map<string, Product[]>();
            const productsByNormName = new Map<string, Product[]>();
            for (const p of prods) {
                const key = canon(p.brand);
                if (!productsByBrand.has(key)) productsByBrand.set(key, []);
                productsByBrand.get(key)!.push(p);

                const nName = canon(p.name);
                if (!productsByNormName.has(nName)) productsByNormName.set(nName, []);
                productsByNormName.get(nName)!.push(p);
            }

            // DEBUG: Log products in DB
            console.log('=== PRODUCTOS EN DB ===');
            console.log('Total productos en DB:', prods.length);
            const dbBrands = Array.from(new Set(prods.map(p => p.brand)));
            console.log('Marcas en DB:', dbBrands);
            const brandKey = canon(brandFromHeader);
            const candidatesForBrand = productsByBrand.get(brandKey) || [];
            console.log(`Productos de marca "${brandFromHeader}" (canon: "${brandKey}"):`, candidatesForBrand.length);
            if (candidatesForBrand.length > 0 && candidatesForBrand.length <= 20) {
                console.log('Nombres de productos en DB para esta marca:', candidatesForBrand.map(p => p.name));
            }

            // ========= NUEVA LÓGICA DE MATCHING BASADA EN PALABRAS CLAVE =========
            // La lógica principal: mínimo 2 palabras clave exactas deben coincidir
            // Esto permite flexibilidad en medidas y variantes pero requiere que
            // el tipo de mueble + modelo (o similar) coincidan exactamente.

            // Función para extraer palabras clave significativas (excluyendo stopwords y números puros)
            const extractKeywords = (s: string): string[] => {
                const normalized = canon(s);
                const tokens = normalized.split(' ').filter(Boolean);
                // Filtrar tokens significativos: 
                // - Mínimo 2 caracteres
                // - No es stopword
                // - No es solo números (pero mantener tokens alfanuméricos como "1P", "6UN")
                return tokens.filter(t =>
                    t.length >= 2 &&
                    !STOPWORDS.has(t)
                );
            };

            // Función para normalizar medidas: "1,40" → "140", "1.60" → "160"
            const normalizeMeasure = (s: string): string => {
                return s
                    .replace(/(\d+)[,.](\d+)/g, '$1$2') // "1,40" → "140"
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            let matchedCount = 0;
            let notFoundCount = 0;
            let invalidCount = 0;

            for (const entry of entries) {
                // Validar que el nombre del entry sea válido (no solo números, mínimo 3 chars)
                const trimmedName = (entry.name || '').trim();
                // Solo ignorar si es SOLO números/espacios/puntuación Y muy corto
                const isInvalidName = !trimmedName ||
                    (trimmedName.length < 3 && /^[\d\s.,]+$/.test(trimmedName));

                if (isInvalidName) {
                    console.warn('Nombre de producto inválido ignorado:', entry.name, '(length:', trimmedName.length, ')');
                    invalidCount++;
                    continue;
                }

                const entryBrandKey = canon(entry.brand);
                let candidates = productsByBrand.get(entryBrandKey) || [];
                if (candidates.length === 0) candidates = prods;

                // Intento 0: Coincidencia exacta por nombre normalizado
                const entryNormName = canon(entry.name);
                const entryNormWithMeasures = normalizeMeasure(entryNormName);
                const exactList = productsByNormName.get(entryNormName);

                if (exactList && exactList.length > 0) {
                    const targets = applyAllVariants
                        ? exactList.filter(p => (brandKey ? normalizeText(p.brand) === brandKey : true))
                        : [exactList.find(p => normalizeText(p.brand) === brandKey) || exactList[0]];

                    const selectedTargets = targets.length > 0 ? targets : exactList;

                    for (const t of selectedTargets) {
                        productToUpdate.set(t.id, {
                            productId: t.id,
                            productName: t.name,
                            currentCost: t.cost || 0,
                            newCost: Math.round(Number(entry.price)),
                            brand: t.brand,
                            selected: true,
                            manuallyModified: false,
                        });
                    }
                    continue;
                }

                // ========= MATCHING POR PALABRAS CLAVE (mínimo 2 exactas) =========
                const entryKeywords = extractKeywords(entry.name);
                const entryKeywordsWithMeasures = extractKeywords(normalizeMeasure(entry.name));

                let best: { score: number; product: Product; matchedKeywords: string[] } | null = null;
                const multiMatches: { score: number; product: Product; matchedKeywords: string[] }[] = [];

                for (const p of candidates) {
                    const productKeywords = extractKeywords(p.name);
                    const productKeywordsWithMeasures = extractKeywords(normalizeMeasure(p.name));

                    // Contar palabras clave exactas que coinciden
                    const exactMatches = entryKeywords.filter(k => productKeywords.includes(k));
                    // También probamos con medidas normalizadas
                    const exactMatchesWithMeasures = entryKeywordsWithMeasures.filter(k =>
                        productKeywordsWithMeasures.includes(k)
                    );

                    const matchCount = Math.max(exactMatches.length, exactMatchesWithMeasures.length);
                    const matchedKeywords = exactMatches.length >= exactMatchesWithMeasures.length
                        ? exactMatches
                        : exactMatchesWithMeasures;

                    // CRITERIO PRINCIPAL: Mínimo 2 palabras clave exactas deben coincidir
                    if (matchCount >= 2) {
                        // Calcular score basado en:
                        // - Cantidad de keywords que coinciden
                        // - Similitud adicional del nombre completo
                        const similar = calculateSimilarity(entryNormName, canon(p.name));

                        let score = matchCount * 15; // Base: 15 puntos por cada keyword
                        score += Math.round(similar * 10); // Bonus: hasta 10 puntos por similitud

                        // Bonus si coinciden números/medidas
                        const entryNums = entryKeywords.filter(t => /\d/.test(t));
                        const prodNums = productKeywords.filter(t => /\d/.test(t));
                        const numMatch = entryNums.some(n => prodNums.includes(n));
                        if (numMatch) score += 10;

                        // Bonus si el nombre del producto contiene el del entry o viceversa
                        if (entryNormName.includes(canon(p.name)) || canon(p.name).includes(entryNormName)) {
                            score += 5;
                        }

                        const matchObj = { score, product: p, matchedKeywords };
                        if (!best || score > best.score) best = matchObj;
                        if (applyAllVariants) multiMatches.push(matchObj);
                    }
                }

                // Fallback: si no hay match de 2+ keywords, intentar con similitud alta
                if (!best) {
                    for (const p of candidates) {
                        const normProd = canon(p.name);
                        const similar = calculateSimilarity(entryNormName, normProd);

                        // Si la similitud es muy alta (>85%), aceptar como match
                        if (similar >= 0.85) {
                            best = { score: Math.round(similar * 100), product: p, matchedKeywords: [] };
                            break;
                        }

                        // O si uno contiene al otro completamente
                        if (entryNormName.length > 3 && normProd.length > 3) {
                            if (normProd.includes(entryNormName) || entryNormName.includes(normProd)) {
                                best = { score: 50, product: p, matchedKeywords: [] };
                                break;
                            }
                        }
                    }
                }

                // Segundo fallback: match por slug (sin espacios)
                if (!best) {
                    const slug = (s: string) => normalizeMeasure(canon(s)).replace(/\s+/g, '');
                    const entrySlug = slug(entry.name);

                    for (const p of candidates) {
                        const prodSlug = slug(p.name);
                        if (entrySlug === prodSlug ||
                            (entrySlug.length > 5 && prodSlug.includes(entrySlug)) ||
                            (prodSlug.length > 5 && entrySlug.includes(prodSlug))) {
                            best = { score: 40, product: p, matchedKeywords: [] };
                            break;
                        }
                    }
                }

                if (best) {
                    if (applyAllVariants && multiMatches.length > 0) {
                        const seen = new Set<number>();
                        multiMatches.sort((a, b) => b.score - a.score).forEach(({ product: p }) => {
                            if (seen.has(p.id)) return;
                            seen.add(p.id);
                            productToUpdate.set(p.id, {
                                productId: p.id,
                                productName: p.name,
                                currentCost: p.cost || 0,
                                newCost: Math.round(Number(entry.price)),
                                brand: p.brand,
                                selected: true,
                                manuallyModified: false,
                            });
                        });
                        matchedCount++;
                    } else {
                        const p = best.product;
                        productToUpdate.set(p.id, {
                            productId: p.id,
                            productName: p.name,
                            currentCost: p.cost || 0,
                            newCost: Math.round(Number(entry.price)),
                            brand: p.brand,
                            selected: true,
                            manuallyModified: false,
                        });
                        matchedCount++;
                    }
                } else {
                    // Solo agregar a notFound si el nombre es válido
                    notFound.push(entry);
                    notFoundCount++;
                }
            }

            // DEBUG: Log final results
            console.log('=== RESULTADO FINAL ===');
            console.log('Total entries procesados:', entries.length);
            console.log('Matched:', matchedCount);
            console.log('Not found:', notFoundCount);
            console.log('Inválidos ignorados:', invalidCount);
            console.log('Productos a actualizar (unique):', productToUpdate.size);
            console.log('Productos en notFound array:', notFound.length);
            if (notFound.length > 0) {
                console.log('Primeros 5 no encontrados:', notFound.slice(0, 5).map(e => e.name));
            }

            // Ordenar notFound para mostrar primero los que tienen costo más alto
            notFound.sort((a, b) => b.price - a.price);
            setSheetNotFound(notFound);
            setSheetUpdates(Array.from(productToUpdate.values()));

        } catch (err) {
            console.error('Error analizando Google Sheets:', err);
            alert((err as Error).message || 'No se pudo analizar el enlace de Google Sheets.');
        } finally {
            setSheetAnalyzing(false);
            setSheetUrl('');
        }
    };

    const updateCostValueSheet = (productId: number, newCost: number) => {
        setSheetUpdates(prev => prev.map(u => u.productId === productId ? { ...u, newCost: newCost, manuallyModified: true } : u));
    };

    const toggleProductSelectionSheet = (productId: number) => {
        setSheetUpdates(prev => prev.map(u => u.productId === productId ? { ...u, selected: !u.selected } : u));
    };

    const selectAllSheet = (selectAll: boolean) => {
        setSheetUpdates(prev => prev.map(u => ({ ...u, selected: selectAll })));
    };

    const executeUpdatesFromSheet = async () => {
        const selected = sheetUpdates.filter(u => u.selected);
        if (selected.length === 0) {
            alert('Selecciona al menos un producto para actualizar.');
            return;
        }
        try {
            setLoading(true);
            const payload = selected.map(u => ({ productId: u.productId, newCost: u.newCost }));
            const results = await bulkUpdateCosts(payload);
            setUpdateResults(results);
            if (results.updated > 0) {
                await loadProducts();
                setSheetUpdates(prev => prev.filter(u => !u.selected));
            }
        } catch (e) {
            console.error('Error actualizando desde planilla:', e);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">📥 Importar Costos desde Google Sheets</h5>
            </div>
            <div className="card-body">
                <div className="mb-3">
                    <label className="form-label fw-bold">Enlace de Google Sheets (público o compartido)</label>
                    <input
                        type="url"
                        className="form-control"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                    />
                    <small className="text-muted d-block mt-1">Debe contener columnas: <strong>ARTICULO</strong> y <strong>COSTO</strong> (o Valor Compra)</small>
                </div>

                <button className="btn btn-warning" onClick={analyzeFromSheet} disabled={sheetAnalyzing || loading}>
                    {sheetAnalyzing ? (
                        <> <span className="spinner-border spinner-border-sm me-2" /> Analizando... </>
                    ) : ('🔗 Analizar Planilla')}
                </button>

                <div className="form-check form-switch mt-3">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="toggleAllVariants"
                        checked={applyAllVariants}
                        onChange={(e) => setApplyAllVariants(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="toggleAllVariants">
                        Aplicar a todas las variantes con el mismo nombre
                    </label>
                </div>

                {sheetWarnings.length > 0 && (
                    <div className="alert alert-soft-warning mt-3 mb-0 border-warning border-opacity-25">
                        <strong className="text-warning-emphasis">Atención:</strong>
                        <ul className="mb-0 text-secondary small">
                            {sheetWarnings.map((w, idx) => (<li key={idx}>{w}</li>))}
                        </ul>
                    </div>
                )}

                {/* Listado de coincidencias */}
                {sheetUpdates.length > 0 && (
                    <div className="mt-4 border rounded overflow-hidden">
                        <div className="bg-light p-2 border-bottom d-flex justify-content-between align-items-center">
                            <div className="fw-bold text-success px-2">✅ {sheetUpdates.length} Coincidencias encontradas</div>
                            <div className="form-check me-2">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-1"
                                    id="selectAll"
                                    checked={sheetUpdates.length > 0 && sheetUpdates.every(u => u.selected)}
                                    onChange={(e) => selectAllSheet(e.target.checked)}
                                />
                                <label className="form-check-label small" htmlFor="selectAll">Seleccionar todo</label>
                            </div>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: '400px' }}>
                            <table className="table table-hover table-sm mb-0">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th style={{ width: '30px' }}></th>
                                        <th>Marca</th>
                                        <th>Producto</th>
                                        <th className="text-end">Costo Actual</th>
                                        <th className="text-end">Costo Nuevo</th>
                                        <th className="text-center">Dif</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheetUpdates.map(u => {
                                        const diff = u.newCost - u.currentCost;
                                        return (
                                            <tr key={`sheet-${u.productId}`} className={u.selected ? 'table-warning bg-opacity-10' : ''}>
                                                <td className="align-middle text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={u.selected}
                                                        onChange={() => toggleProductSelectionSheet(u.productId)}
                                                    />
                                                </td>
                                                <td className="small text-muted align-middle">{u.brand}</td>
                                                <td className="fw-medium align-middle">{u.productName}</td>
                                                <td className="text-end text-muted align-middle">${u.currentCost.toLocaleString()}</td>
                                                <td className="text-end align-middle">
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm text-end"
                                                        style={{ width: '100px', display: 'inline-block' }}
                                                        value={u.newCost}
                                                        onChange={(e) => updateCostValueSheet(u.productId, Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="text-center align-middle">
                                                    <span className={`badge ${diff > 0 ? 'bg-danger' : (diff < 0 ? 'bg-success' : 'bg-secondary')}`}>
                                                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-light border-top">
                            <button
                                className="btn btn-success w-100 fw-bold"
                                onClick={executeUpdatesFromSheet}
                                disabled={loading || sheetUpdates.every(u => !u.selected)}
                            >
                                {loading ? (
                                    <> <span className="spinner-border spinner-border-sm me-2" /> Guardando... </>
                                ) : '💾 Confirmar y Actualizar Costos'}
                            </button>
                            {updateResults && (
                                <div className={`mt-2 alert ${updateResults.errors.length > 0 ? 'alert-warning' : 'alert-success'} py-2 small mb-0`}>
                                    Se actualizaron <strong>{updateResults.updated}</strong> productos.
                                    {updateResults.errors.length > 0 && ` Hubo errores en ${updateResults.errors.length}.`}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Productos no encontrados - Asociación y Edición Manual */}
                {sheetNotFound.length > 0 && (
                    <div className="mt-4 border rounded overflow-hidden border-danger">
                        <div className="bg-danger bg-opacity-10 p-2 border-bottom d-flex justify-content-between align-items-center">
                            <div className="fw-bold text-danger px-2">⚠️ {sheetNotFound.length} Productos sin coincidencia</div>
                            <small className="text-muted">Busca el producto en la DB, selecciona, ajusta costo y guarda</small>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: '400px' }}>
                            <table className="table table-hover table-sm mb-0">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th>Nombre en Planilla</th>
                                        <th style={{ minWidth: '250px' }}>Buscar Producto en DB</th>
                                        <th className="text-end" style={{ width: '120px' }}>Costo Nuevo</th>
                                        <th style={{ width: '220px' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheetNotFound.map((entry, idx) => (
                                        <NotFoundRow
                                            key={`nf-${idx}`}
                                            entry={entry}
                                            products={products}
                                            onUpdate={(productName, cost) => {
                                                // Remover de la lista de no encontrados tras guardar
                                                setSheetNotFound(prev => prev.filter((_, i) => i !== idx));
                                                // Recargar productos para reflejar el cambio
                                                loadProducts();
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CostUpdateForm;
