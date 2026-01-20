'use client';

import React, { useState, useEffect } from 'react';
import { getProducts, bulkUpdatePrices, Product, findProductsByNameAndBrand } from '@/services/productService';
import { fetchGoogleSheetCsv, parseCsv, SheetPriceEntry, smartParseInt } from '@/lib/sheets';

interface PriceUpdate {
  productId: number;
  productName: string;
  currentPrice: number;
  newPrice: number;
  brand: string;
  selected: boolean;
  manuallyModified: boolean;
}

// (Flujo por marca eliminado)  

const PriceUpdateForm: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [updateResults, setUpdateResults] = useState<{ updated: number; errors: any[] } | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<PriceUpdate[]>([]);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);
  // Estado para importación desde Google Sheets
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [sheetAnalyzing, setSheetAnalyzing] = useState(false);
  const [sheetUpdates, setSheetUpdates] = useState<PriceUpdate[]>([]);
  const [sheetWarnings, setSheetWarnings] = useState<string[]>([]);
  const [sheetNotFound, setSheetNotFound] = useState<SheetPriceEntry[]>([]);
  // Toggle: aplicar a todas las variantes (mismo nombre) o solo una
  const [applyAllVariants, setApplyAllVariants] = useState<boolean>(true);

  useEffect(() => {
    loadProducts();
  }, []);

  // ===== Utilidades de resumen y exportación =====
  type BrandSummary = { brand: string; count: number; totalDiff: number; avgPct: number };

  const computeTotals = (changes: PriceUpdate[]) => {
    const totalDiff = changes.reduce((acc, u) => acc + (u.newPrice - u.currentPrice), 0);
    const pctList = changes.map((u) => ((u.newPrice - u.currentPrice) / (u.currentPrice || 1)) * 100);
    const avgPct = pctList.length > 0
      ? pctList.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / pctList.length
      : 0;
    return { totalDiff: Math.round(totalDiff), avgPct };
  };

  const summarizeByBrand = (changes: PriceUpdate[]): BrandSummary[] => {
    const map = new Map<string, { count: number; totalDiff: number; pctSum: number }>();
    for (const u of changes) {
      const key = u.brand || '—';
      const diff = u.newPrice - u.currentPrice;
      const pct = ((u.newPrice - u.currentPrice) / (u.currentPrice || 1)) * 100;
      if (!map.has(key)) map.set(key, { count: 0, totalDiff: 0, pctSum: 0 });
      const agg = map.get(key)!;
      agg.count += 1;
      agg.totalDiff += diff;
      agg.pctSum += Number.isFinite(pct) ? pct : 0;
    }
    const list: BrandSummary[] = Array.from(map.entries()).map(([brand, v]) => ({
      brand,
      count: v.count,
      totalDiff: Math.round(v.totalDiff),
      avgPct: v.count > 0 ? v.pctSum / v.count : 0,
    }));
    // Ordenar por mayor impacto absoluto
    list.sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff));
    return list;
  };

  const exportAppliedToCsv = (changes: PriceUpdate[]) => {
    const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    const header = ['Marca', 'Producto', 'PrecioAnterior', 'PrecioNuevo', 'Diferencia', 'Porcentaje'].join(',');
    const lines = changes.map((u) => {
      const diff = u.newPrice - u.currentPrice;
      const pct = ((diff) / (u.currentPrice || 1)) * 100;
      return [
        esc(u.brand || ''),
        esc(u.productName || ''),
        String(u.currentPrice),
        String(u.newPrice),
        String(diff),
        Number.isFinite(pct) ? pct.toFixed(2) : '0.00',
      ].join(',');
    });
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cambios-precios-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySummaryToClipboard = async (changes: PriceUpdate[]) => {
    const totals = computeTotals(changes);
    const brandAgg = summarizeByBrand(changes);
    const lines: string[] = [];
    lines.push(`Productos actualizados: ${changes.length}`);
    lines.push(`Variación total: ${totals.totalDiff > 0 ? '+' : ''}${totals.totalDiff}`);
    lines.push(`Promedio %: ${totals.avgPct.toFixed(1)}%`);
    if (brandAgg.length > 0) {
      lines.push('— Por marca —');
      for (const b of brandAgg) {
        lines.push(`  ${b.brand}: ${b.count} items | Δ ${b.totalDiff > 0 ? '+' : ''}${b.totalDiff} | ${b.avgPct.toFixed(1)}%`);
      }
    }
    lines.push('— Detalle —');
    for (const u of changes.slice(0, 50)) {
      const diff = u.newPrice - u.currentPrice;
      const pct = ((diff) / (u.currentPrice || 1)) * 100;
      lines.push(`  ${u.brand} — ${u.productName}: ${u.currentPrice} → ${u.newPrice} ( ${diff > 0 ? '+' : ''}${diff}, ${Number.isFinite(pct) ? pct.toFixed(1) : '0.0'}% )`);
    }
    if (changes.length > 50) {
      lines.push(`  … y ${changes.length - 50} más`);
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Resumen copiado al portapapeles.');
    } catch (e) {
      console.error('No se pudo copiar al portapapeles:', e);
    }
  };

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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Stopwords comunes ES/PT para mejorar el matching por tokens
  const STOPWORDS = new Set<string>([
    'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'CON', 'PARA', 'EN', 'AL', 'A', 'POR',
    'DA', 'DO', 'DAS', 'DOS', 'E', 'COM', 'PARA', 'EM', 'AO', 'AOS', 'PRA', 'PRAA',
  ]);
  const tokenize = (s: string) =>
    normalizeText(s)
      .split(' ')
      .filter(Boolean)
      .filter(t => !STOPWORDS.has(t));

  // (Inicialización por marca eliminada)

  // (Análisis por marca eliminado)

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  // (Handlers del flujo por marca eliminados)

  // ===== Importación desde Google Sheets: Handlers =====
  const analyzeFromSheet = async () => {
    const currentUrl = sheetUrl.trim();
    if (!currentUrl) {
      alert('Por favor pega un enlace válido de Google Sheets.');
      return;
    }
    try {
      setSheetAnalyzing(true);
      // Limpiar inmediatamente el input para permitir pegar otro link mientras analiza
      setSheetUrl('');
      setUpdateResults(null);
      setSheetWarnings([]);
      setSheetNotFound([]);

      const csv = await fetchGoogleSheetCsv(currentUrl);
      // Asegurar productos cargados antes de analizar
      if (products.length === 0) {
        await loadProducts();
      }
      const prods = products.length > 0 ? products : await getProducts();
      const parsed = parseCsv(csv);
      const headersNorm = parsed.headers.map(h => h.trim());
      const headersLower = headersNorm.map(h => h.toLowerCase());

      // PRODUCTO obligatorio
      const productHeaderCandidates = ['articulo', 'artículo', 'producto', 'descripcion', 'descripción', 'modelo'];
      const productHeaderIdx = headersLower.findIndex(h => productHeaderCandidates.includes(h));

      // PRECIO: aceptar varios nombres comunes (incluyendo "web" para precios web)
      const priceHeaderCandidates = ['web', 'unitario', 'precio', 'price', 'valor', 'monto'];
      const unitarioIdx = headersLower.findIndex(h => priceHeaderCandidates.includes(h));

      // MARCA opcional inferida por encabezado que coincida con marcas existentes
      const existingBrands = Array.from(new Set(prods.map(p => normalizeText(p.brand))));
      const brandHeaderIdx = headersNorm.findIndex(h => existingBrands.includes(normalizeText(h)));
      const brandFromHeader = brandHeaderIdx >= 0 ? headersNorm[brandHeaderIdx] : '';

      const warnings: string[] = [];
      if (productHeaderIdx === -1) warnings.push('No se encontró columna de ARTICULO/PRODUCTO en la planilla.');
      if (unitarioIdx === -1) warnings.push('No se encontró columna de PRECIO (web/unitario/precio/valor/monto). No se actualizarán productos.');
      if (brandHeaderIdx === -1) warnings.push('No se detectó la marca por encabezado; se intentará igualar por nombre sin marca.');
      setSheetWarnings(warnings);

      if (productHeaderIdx === -1 || unitarioIdx === -1) {
        setSheetUpdates([]);
        setSheetAnalyzing(false);
        return;
      }

      const productHeader = headersNorm[productHeaderIdx];
      const priceHeader = headersNorm[unitarioIdx];

      const entries = parsed.rows.map(r => {
        const name = String(r[productHeader] ?? '').toString().trim();
        const raw = r[priceHeader];
        // Usar smartParseInt para manejar correctamente todos los formatos numéricos
        const price = smartParseInt(raw as string | number);
        return {
          brand: brandFromHeader || '',
          name,
          price: Number.isNaN(price) ? 0 : price,
        };
      }).filter(e => e.name && e.price > 0);

      const productToUpdate = new Map<number, PriceUpdate>();
      const notFound: SheetPriceEntry[] = [];

      // Canonizador de sinónimos frecuentes (ES↔PT y plurales)
      const canon = (s?: string | null) => {
        let n = normalizeText(s);
        // Normalizaciones generales
        n = n
          .replace(/\bESCALIPTUS\b/g, 'EUCALIPTUS')
          .replace(/\bEUCALIPTO\b/g, 'EUCALIPTUS')
          .replace(/\bSILLONES\b/g, 'SILLON')
          .replace(/\bSILLAS\b/g, 'SILLA');

        // Sinónimos ES↔PT comunes en MOVAL
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

        // Normalizar/Eliminar contadores de puertas: 3P, 6P, 6 PTAS, 3 PTS, 2 PORTAS, etc.
        n = n
          .replace(/\b(\d+)\s*(PUERTAS|PUERTA|PTAS|PTS|PORTAS|PORTA|P)\b/g, '$1P')
          .replace(/\b(\d+)P\b/g, '')
          .replace(/\b(\d+)\s*PORTAS?\b/g, '')
          .replace(/\b(\d+)\s*PUERTAS?\b/g, '')
          .replace(/\b(\d+)\s*PTS?\b/g, '')
          .replace(/\b(\d+)\s*PTAS?\b/g, '');

        // Quitar conectores y accesorios poco relevantes para el match
        n = n
          .replace(/\bPES\b/g, '') // PÉS sin acento por normalización
          .replace(/\bPATAS\b/g, '')
          .replace(/\bLED\b/g, '')
          .replace(/\+/g, ' ');

        // Compactar espacios tras eliminar accesorios
        n = n.replace(/\s+/g, ' ').trim();
        return n;
      };

      // Pre-index por marca y por nombre normalizado (para coincidencia exacta rápida)
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

      for (const entry of entries) {
        const brandKey = canon(entry.brand);
        let candidates = productsByBrand.get(brandKey) || [];
        // Fallback: si no hay marca detectada o no hay candidatos por marca, buscar en todo el catálogo
        if (candidates.length === 0) {
          candidates = prods;
        }

        // Intento 0: coincidencia exacta por nombre normalizado
        const entryNormName = canon(entry.name);
        const exactList = productsByNormName.get(entryNormName);
        if (exactList && exactList.length > 0) {
          if (applyAllVariants) {
            // Aplicar a TODAS las coincidencias exactas (filtrando por marca si está disponible)
            const targets = exactList.filter(p => (brandKey ? normalizeText(p.brand) === brandKey : true));
            const selectedTargets = targets.length > 0 ? targets : exactList; // si no hay match por marca, aplicar a todas
            for (const t of selectedTargets) {
              productToUpdate.set(t.id, {
                productId: t.id,
                productName: t.name,
                currentPrice: t.price,
                newPrice: Math.round(Number(entry.price)),
                brand: t.brand,
                selected: true,
                manuallyModified: false,
              });
            }
          } else {
            // Solo una coincidencia: preferir la marca detectada
            const chosen = exactList.find(p => normalizeText(p.brand) === brandKey) || exactList[0];
            productToUpdate.set(chosen.id, {
              productId: chosen.id,
              productName: chosen.name,
              currentPrice: chosen.price,
              newPrice: Math.round(Number(entry.price)),
              brand: chosen.brand,
              selected: true,
              manuallyModified: false,
            });
          }
          continue; // ya resuelto para este entry
        }

        // Tokenización basada en canon() para contemplar sinónimos ES↔PT
        const tokenizeCanon = (s: string) => canon(s).split(' ').filter(Boolean).filter(t => !STOPWORDS.has(t));
        const eTokensRaw = tokenizeCanon(entry.name);
        const stem = (t: string) => (t.length > 3 && t.endsWith('S') ? t.slice(0, -1) : t);
        const eTokens = eTokensRaw
          .filter(t => t.length >= 2 || /^\d+$/.test(t))
          .map(stem);
        let best: { score: number; product: Product } | null = null;
        const multiMatches: { score: number; product: Product }[] = [];
        // Primera pasada (estricta/permisiva actual)
        for (const p of candidates) {
          const pTokens = tokenizeCanon(p.name).map(stem);
          // Requerir al menos 50% de solapamiento y al menos 2 tokens que coincidan
          const overlapCount = eTokens.filter(t => pTokens.includes(t)).length;
          const overlapRatio = eTokens.length > 0 ? overlapCount / eTokens.length : 0;
          const similar = calculateSimilarity(canon(entry.name), canon(p.name));
          // Umbrales dinámicos: para MOVAL permitimos un poco menos de solapamiento porque hay sinónimos ES↔PT
          let minOverlapRatio = 0.45;
          let minOverlapCount = 2;
          let minSimilar = 0.86;
          if (brandKey === canon('Moval')) {
            minOverlapRatio = 0.30;
            minOverlapCount = 1;
            minSimilar = 0.80;
          }
          if (!(overlapRatio >= minOverlapRatio && overlapCount >= minOverlapCount) && similar < minSimilar) continue;

          const normName = canon(entry.name);
          const normProd = canon(p.name);
          const startsWithWholeWord = new RegExp(`\\b${normName.replace(/[-/\\^$*+?.()|[\]{}]/g, '')}\\b`).test(
            normProd
          );
          const containsEither = normProd.includes(normName) || normName.includes(normProd);
          let score = 0;
          if (startsWithWholeWord) score += 5;
          if (containsEither) score += 7;
          // mayor solapamiento favorecido
          score += Math.min(Math.round(overlapRatio * 10), 10);
          // similitud de cadenas favorecida
          score += Math.min(Math.round(similar * 10), 10);
          // priorizar coincidencias con tokens numéricos (medidas 80x80, 150x80 etc.)
          const hasNumeric = eTokens.some(t => /\d/.test(t)) && pTokens.some(t => /\d/.test(t));
          if (hasNumeric) score += 2;
          score += Math.min(eTokens.length, 5);
          score += Math.min(normName.length / 5, 5);

          const matchObj = { score, product: p };
          if (!best || score > best.score) best = matchObj;
          if (applyAllVariants) multiMatches.push(matchObj);
        }

        // Segunda pasada: si no hubo match, relajar umbrales
        if (!best) {
          for (const p of candidates) {
            const normName = normalizeText(entry.name);
            const normProd = normalizeText(p.name);
            if (normName === normProd || normProd.includes(normName) || normName.includes(normProd)) {
              best = { score: 1e6, product: p }; // match fuerte por igualdad/contención
              break;
            }
            // Fallback por slug: quitar espacios completamente y símbolos
            const slug = (s: string) => canon(s).replace(/\s+/g, '');
            if (slug(entry.name) === slug(p.name) || slug(p.name).includes(slug(entry.name)) || slug(entry.name).includes(slug(p.name))) {
              best = { score: 9e5, product: p };
              break;
            }
            const eTokens2 = tokenizeCanon(entry.name);
            const pTokens2 = tokenizeCanon(p.name);
            const overlap2 = eTokens2.filter(t => pTokens2.includes(t)).length;
            const similar2 = calculateSimilarity(normName, normProd);
            if (overlap2 >= 1 && similar2 >= 0.80) {
              best = { score: Math.round(similar2 * 100), product: p };
              break;
            }
          }
        }

        if (best) {
          if (applyAllVariants && multiMatches.length > 0) {
            // Ordenar por score descendente y agregar todos los distintos productos
            const seen = new Set<number>();
            multiMatches
              .sort((a, b) => b.score - a.score)
              .forEach(({ product: p }) => {
                if (seen.has(p.id)) return;
                seen.add(p.id);
                productToUpdate.set(p.id, {
                  productId: p.id,
                  productName: p.name,
                  currentPrice: p.price,
                  newPrice: Math.round(Number(entry.price)),
                  brand: p.brand,
                  selected: true,
                  manuallyModified: false,
                });
              });
          } else {
            const p = best.product;
            productToUpdate.set(p.id, {
              productId: p.id,
              productName: p.name,
              currentPrice: p.price,
              newPrice: Math.round(Number(entry.price)),
              brand: p.brand,
              selected: true,
              manuallyModified: false,
            });
          }
        } else {
          notFound.push(entry);
        }
      }

      // Fallback 2: consulta a BD por ILIKE para los no encontrados
      if (notFound.length > 0) {
        const byCanonEntry = new Map<string, SheetPriceEntry[]>();
        for (const e of notFound) {
          const key = canon(e.name);
          if (!byCanonEntry.has(key)) byCanonEntry.set(key, []);
          byCanonEntry.get(key)!.push(e);
        }

        const terms = notFound.map(e => ({ name: e.name, brand: e.brand || brandFromHeader || '' }));
        try {
          const { found } = await findProductsByNameAndBrand(terms);
          if (applyAllVariants) {
            // Aplicar a TODOS los productos encontrados para cada nombre canónico
            const usedKeys = new Set<string>();
            const allEntryKeys = Array.from(byCanonEntry.keys());
            for (const p of found) {
              const prodKey = canon(p.name);
              // Preferir exacta, si no, buscar una key que esté contenida o contenga
              let arr = byCanonEntry.get(prodKey);
              if (!arr || arr.length === 0) {
                const altKey = allEntryKeys.find(k => k && (prodKey.includes(k) || k.includes(prodKey)) && (byCanonEntry.get(k)?.length || 0) > 0);
                if (altKey) arr = byCanonEntry.get(altKey);
              }
              if (arr && arr.length > 0) {
                const e = arr[0];
                productToUpdate.set(p.id, {
                  productId: p.id,
                  productName: p.name,
                  currentPrice: p.price,
                  newPrice: Math.round(Number(e.price)),
                  brand: p.brand,
                  selected: true,
                  manuallyModified: false,
                });
                usedKeys.add(prodKey);
              }
            }
            // Tras procesar todas las coincidencias, marcar esos nombres como resueltos para que no aparezcan en notFound
            usedKeys.forEach((k) => {
              byCanonEntry.set(k, []);
            });
          } else {
            // Solo una coincidencia por nombre canónico
            const allEntryKeys = Array.from(byCanonEntry.keys());
            for (const p of found) {
              const prodKey = canon(p.name);
              let arr = byCanonEntry.get(prodKey);
              if (!arr || arr.length === 0) {
                const altKey = allEntryKeys.find(k => k && (prodKey.includes(k) || k.includes(prodKey)) && (byCanonEntry.get(k)?.length || 0) > 0);
                if (altKey) arr = byCanonEntry.get(altKey);
              }
              if (arr && arr.length > 0) {
                const e = arr[0];
                productToUpdate.set(p.id, {
                  productId: p.id,
                  productName: p.name,
                  currentPrice: p.price,
                  newPrice: Math.round(Number(e.price)),
                  brand: p.brand,
                  selected: true,
                  manuallyModified: false,
                });
                // tras el primero, no aplicar a más de ese nombre
                byCanonEntry.set(prodKey, []);
                break;
              }
            }
          }
          // reconstruir notFound con los que quedaron sin arr
          const residual: SheetPriceEntry[] = [];
          for (const list of Array.from(byCanonEntry.values())) {
            residual.push(...list);
          }
          setSheetNotFound(residual);
        } catch (e) {
          console.error('Fallback BD ILIKE falló:', e);
          // si falla, mantener notFound original
          setSheetNotFound(notFound);
        }
      } else {
        setSheetNotFound(notFound);
      }
      setSheetUpdates(Array.from(productToUpdate.values()));
    } catch (err) {
      console.error('Error analizando Google Sheets:', err);
      alert((err as Error).message || 'No se pudo analizar el enlace de Google Sheets.');
    } finally {
      setSheetAnalyzing(false);
      // Limpiar el input del enlace para poder pegar el próximo
      setSheetUrl('');
    }
  };

  const updatePriceValueSheet = (productId: number, newPrice: number) => {
    setSheetUpdates(prev => prev.map(u => u.productId === productId ? { ...u, newPrice, manuallyModified: true } : u));
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
      const payload = selected.map(u => ({ productId: u.productId, newPrice: u.newPrice }));
      const results = await bulkUpdatePrices(payload);
      setUpdateResults(results);
      // Registrar detalle de cambios aplicados (exitosos) para mostrar al usuario
      const failedIds = new Set((results.errors || []).map((e: any) => e?.productId));
      const successful = selected.filter(u => !failedIds.has(u.productId));
      if (successful.length > 0) {
        setAppliedChanges(successful);
        setAppliedAt(new Date().toLocaleString());
      } else {
        setAppliedChanges([]);
        setAppliedAt(null);
      }
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

  // (Funciones de flujo por marca eliminadas)

  if (loading && products.length === 0) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando productos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">🏷️ Actualización Masiva de Precios</h4>
            </div>
            <div className="card-body">
              {/* Importación desde Google Sheets */}
              <div className="card mb-4">
                <div className="card-header bg-warning">
                  <strong>📥 Importar precios desde Google Sheets</strong>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Enlace de Google Sheets (compartido como &quot;Cualquiera con el enlace&quot;)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="Pega aquí el enlace de Google Sheets"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                    <small className="text-muted">Formato recomendado de columnas: Marca | ARTICULO | WEB (o Precio/Unitario/Valor)</small>
                  </div>
                  <button className="btn btn-warning" onClick={analyzeFromSheet} disabled={sheetAnalyzing || loading}>
                    {sheetAnalyzing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" /> Analizando planilla...
                      </>
                    ) : (
                      <>🔗 Analizar desde Google Sheets</>
                    )}
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
                    <div className="alert alert-warning mt-3 mb-0">
                      <strong>Advertencias de columnas:</strong>
                      <ul className="mb-0">
                        {sheetWarnings.map((w, idx) => (<li key={idx}>{w}</li>))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Resultados de importación desde Google Sheets */}
              {sheetUpdates.length > 0 && (
                <div className="card border-info mb-4">
                  <div className="card-header bg-info text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">✅ Coincidencias desde planilla: {sheetUpdates.length}</h5>
                      <div>
                        <input
                          type="checkbox"
                          className="form-check-input me-2"
                          checked={sheetUpdates.length > 0 && sheetUpdates.every(u => u.selected)}
                          onChange={(e) => selectAllSheet(e.target.checked)}
                        />
                        <label>Seleccionar todo</label>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-striped mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th></th>
                            <th>Marca</th>
                            <th>Producto</th>
                            <th>Precio Actual</th>
                            <th>Precio Nuevo</th>
                            <th>Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheetUpdates.map(u => {
                            const diff = u.newPrice - u.currentPrice;
                            const pct = (diff / (u.currentPrice || 1)) * 100;
                            return (
                              <tr key={`sheet-${u.productId}`} className={u.selected ? 'table-info' : ''}>
                                <td>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={u.selected}
                                    onChange={() => toggleProductSelectionSheet(u.productId)}
                                  />
                                </td>
                                <td className="fw-semibold">{u.brand}</td>
                                <td className="fw-bold">{u.productName}</td>
                                <td>${u.currentPrice.toLocaleString()}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    style={{ width: '120px' }}
                                    value={u.newPrice}
                                    onChange={(e) => updatePriceValueSheet(u.productId, Number(e.target.value))}
                                  />
                                </td>
                                <td>
                                  <span
                                    className={
                                      diff === 0
                                        ? 'badge bg-secondary'
                                        : diff > 0
                                          ? 'badge bg-danger'
                                          : 'badge bg-success'
                                    }
                                  >
                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()} (
                                    {Number.isFinite(pct) ? pct.toFixed(1) : '0.0'}%)
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer d-flex justify-content-between align-items-center">
                    <button
                      className="btn btn-success"
                      onClick={executeUpdatesFromSheet}
                      disabled={loading || sheetAnalyzing || sheetUpdates.every(u => !u.selected)}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" /> Actualizando...
                        </>
                      ) : (
                        <>💾 Actualizar precios seleccionados</>
                      )}
                    </button>
                    <small className="text-muted">
                      Seleccionados: {sheetUpdates.filter(u => u.selected).length} / {sheetUpdates.length}
                    </small>
                  </div>
                </div>
              )}

              {sheetNotFound.length > 0 && (
                <div className="card border-warning mb-4">
                  <div className="card-header bg-warning">
                    <strong>🔎 No encontrados en el catálogo</strong>
                  </div>
                  <div className="card-body">
                    <details>
                      <summary className="mb-2">Ver lista ({sheetNotFound.length})</summary>
                      <ul className="mb-0">
                        {sheetNotFound.slice(0, 20).map((nf, idx) => (
                          <li key={`nf-${idx}`}>
                            <span className="fw-semibold">{nf.name}</span>
                            {nf.brand ? <span className="text-muted"> — {nf.brand}</span> : null}
                            {typeof nf.price === 'number' ? (
                              <span className="text-muted"> — ${nf.price.toLocaleString()}</span>
                            ) : null}
                          </li>
                        ))}
                        {sheetNotFound.length > 20 && (
                          <li className="text-muted">… y {sheetNotFound.length - 20} más</li>
                        )}
                      </ul>
                    </details>
                  </div>
                </div>
              )}

              {/* Resultados de la actualización */}
              {updateResults && (
                <div className={`alert ${updateResults.errors.length > 0 ? 'alert-warning' : 'alert-success'} mt-4`}>
                  <h6>📈 Resultados de la actualización:</h6>
                  <p className="mb-1">✅ <strong>{updateResults.updated}</strong> precios actualizados correctamente</p>
                  {updateResults.errors.length > 0 && (
                    <p className="mb-0">❌ <strong>{updateResults.errors.length}</strong> errores encontrados</p>
                  )}
                </div>
              )}

              {/* Resumen detallado de cambios aplicados */}
              {appliedChanges.length > 0 && (
                <div className="card border-success mt-3">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">🧾 Cambios aplicados {appliedAt ? `( ${appliedAt} )` : ''}</h6>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-light btn-sm"
                        onClick={() => exportAppliedToCsv(appliedChanges)}
                      >
                        ⬇️ Descargar CSV
                      </button>
                      <button
                        className="btn btn-outline-light btn-sm"
                        onClick={() => copySummaryToClipboard(appliedChanges)}
                      >
                        📋 Copiar resumen
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="row g-3 mb-3">
                      {(() => {
                        const totals = computeTotals(appliedChanges);
                        const brandAgg = summarizeByBrand(appliedChanges);
                        return (
                          <>
                            <div className="col-12 col-md-4">
                              <div className="p-3 bg-light rounded border">
                                <div className="text-muted">Productos actualizados</div>
                                <div className="fs-4 fw-bold">{appliedChanges.length}</div>
                              </div>
                            </div>
                            <div className="col-12 col-md-4">
                              <div className="p-3 bg-light rounded border">
                                <div className="text-muted">Variación total</div>
                                <div className={`fs-4 fw-bold ${totals.totalDiff > 0 ? 'text-danger' : totals.totalDiff < 0 ? 'text-success' : ''}`}>
                                  {totals.totalDiff > 0 ? '+' : ''}{totals.totalDiff.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-md-4">
                              <div className="p-3 bg-light rounded border">
                                <div className="text-muted">Promedio %</div>
                                <div className={`fs-4 fw-bold ${totals.avgPct > 0 ? 'text-danger' : totals.avgPct < 0 ? 'text-success' : ''}`}>
                                  {totals.avgPct.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            {brandAgg.length > 0 && (
                              <div className="col-12">
                                <details>
                                  <summary className="mb-2">Resumen por marca ({brandAgg.length})</summary>
                                  <div className="table-responsive">
                                    <table className="table table-sm">
                                      <thead>
                                        <tr>
                                          <th>Marca</th>
                                          <th>Cant.</th>
                                          <th>Δ Total</th>
                                          <th>Δ Promedio %</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {brandAgg.map(b => (
                                          <tr key={b.brand}>
                                            <td className="fw-semibold">{b.brand}</td>
                                            <td>{b.count}</td>
                                            <td className={b.totalDiff > 0 ? 'text-danger' : b.totalDiff < 0 ? 'text-success' : ''}>
                                              {b.totalDiff > 0 ? '+' : ''}{b.totalDiff.toLocaleString()}
                                            </td>
                                            <td className={b.avgPct > 0 ? 'text-danger' : b.avgPct < 0 ? 'text-success' : ''}>
                                              {b.avgPct.toFixed(1)}%
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Marca</th>
                            <th>Producto</th>
                            <th>Precio anterior</th>
                            <th>Precio nuevo</th>
                            <th>Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appliedChanges.map((u) => {
                            const diff = u.newPrice - u.currentPrice;
                            const pct = (diff / (u.currentPrice || 1)) * 100;
                            return (
                              <tr key={`applied-${u.productId}`}>
                                <td className="fw-semibold">{u.brand}</td>
                                <td className="fw-bold">{u.productName}</td>
                                <td>${u.currentPrice.toLocaleString()}</td>
                                <td>${u.newPrice.toLocaleString()}</td>
                                <td>
                                  <span className={diff === 0 ? 'badge bg-secondary' : diff > 0 ? 'badge bg-danger' : 'badge bg-success'}>
                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()} ({Number.isFinite(pct) ? pct.toFixed(1) : '0.0'}%)
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceUpdateForm;
