'use client';

import React, { useState, useEffect } from 'react';
import { getProducts, bulkUpdatePrices, Product } from '@/services/productService';

interface PriceUpdate {
  productId: number;
  productName: string;
  currentPrice: number;
  newPrice: number;
  brand: string;
  selected: boolean;
  manuallyModified: boolean;
}

interface BrandAnalysis {
  brand: string;
  totalProducts: number;
  foundMatches: number;
  updates: PriceUpdate[];
  analyzed: boolean;
}

// Datos de precios extraídos de las capturas
const PRICE_DATA = {
  'Mosconi': {
    'PLACARD 22 PACK': 73900,
    'PLACARD 23 PACK': 104700,
    'PLACARD 24 PACK': 124800,
    'PLACARD 26 PACK': 176900,
    'PLACARD 22 DAKAR': 106800,
    'PLACARD 23 DAKAR': 148900,
    'PLACARD 24 DAKAR': 180500,
    'PLACARD 26 DAKAR': 256300,
    'PLACARD 6 PTAS DAKAR PLUS': 242900,
    'PLACARD 8 PTAS DAKAR PLUS': 302200,
    'PLACARD 12 PTAS DAKAR PLUS': 421700,
    'MESA LUZ EXPRESS': 49000,
    'MESA LUZ SUPER EXPRESS': 42000,
    'MESA LUZ MILENIAL': 47000,
    'CHIFONNIER 5 CAJ': 80000,
    'COMODA 5 CAJ': 99000,
    'ORGANIZADOR PLANCHADO': 85000,
    'ZAPATERO 3 PTAS': 95000,
    'ZAPATERO MILENIAL': 129000,
    'BIBLIOTECA C/ESTANTES': 78000,
    'BIBLIOTECA C/ESTANTES C/PTA': 95000,
    'DESPENSERO 1,70': 95000,
    'COMBO COCINA 1,2 C/BACHA': 304000,
    'COMBO COCINA 1,4 C/BACHA': 386000,
    'COMBO COCINA 1,6 C/BACHA': 455000,
    'ESCRITORIO CLASSIC': 129000,
    'VAJILLERO NORDICO': 189000,
    'VAJILLERO DOORS 130': 165000,
    'VAJILLERO DOORS 170': 249000,
    'MESA CENTRO MILENIAL': 119000,
    'BOX BENETHON 1 PLAZA': 213000,
    'BOX BENETHON 2 PLAZAS': 350000
  },
  'Demobile': {
    'PLACARD LAREDO': 1099000,
    'PLACARD BELGA': 875000,
    'PLACARD ATRICE': 978000,
    'PLACARD ATTORE': 723000,
    'PLACARD RESIDENCE': 598000,
    'PLACARD PERSIA': 349000,
    'PLACARD ASTRO': 248000,
    'PLACARD ECOM II': 219000,
    'PLACARD WIND': 176000,
    'PLACARD NEW REALCE': 512000,
    'PLACARD VERSO': 375000,
    'PLACARD HIMALAYA': 649000,
    'PLACARD FLASH II': 246000,
    'PLACARD ESQUINERO IRLANDA': 1255000,
    'ARMARIO ZAPATERO GRIFFE': 277000,
    'ARMARIO ZAPATERO GOLDEN': 142000,
    'ARMARIO MULTIUSO C/ESPEJO JOY': 227000,
    'ARMARIO 1 PTA C/ESPEJO REFLEX I': 172000,
    'ARMARIO MULTIUSO 2 PTAS C/LLAVE ELITE': 165000,
    'ARMARIO MULTIUSO 2 PTAS VIENA': 89700,
    'CABECERA TRIUNFO': 176000,
    'TOCADOR CAMARIN CARISMA': 229000,
    'COMODA GIARDINO': 262000,
    'COMODA LONDON': 363000,
    'COMODA ATRIA': 179000,
    'MESA LUZ ESSENCE': 89700,
    'ESCRITORIO OFFICE MORADA 1 PTA': 105300,
    'ESCRITORIO VITORIA': 105300,
    'ESCRITORIO OFFICE C/ARMARIO': 156000,
    'ESCRITORIO COMPUTADORA OFFICE': 102000,
    'KIT COCINA AMORA': 437000,
    'KIT COCINA PITAYA': 312000,
    'KIT COCINA AMARANTO P/BACHA': 285000,
    'KIT COCINA ENCANTO': 298000,
    'KIT COCINA ALAMO': 269000,
    'KIT COCINA HARMONIA': 227000,
    'KIT COCINA MALTA': 152000,
    'KIT COCINA SELECT': 299000,
    'BAJO MESADA FIRENZE': 136500,
    'ALACENA FIRENZE': 98000
  },
  'Molufan': {
    'BUTACA ONIX': 558000,
    'BUTACA JOLY GIRATORIA': 667500,
    'BUTACA JOLY C/PATAS': 569500,
    'BUTACA PLAZA 1 LUGAR': 548000,
    'BUTACA PLAZA 2 LUGARES': 719000,
    'BUTACA LUA': 270500,
    'BUTACA MALY GIRATORIA': 800000,
    'BUTACA ZAFIRA': 872000,
    'BUTACA PIETRA': 402000,
    'BUTACA LIZ': 452000,
    'BUTACA LINCE 1 LUGAR': 592000,
    'BUTACA LINCE 2 LUGARES': 820000,
    'SOFA CAMA EVA': 800000,
    'SOFA PASSION 2.40': 1434500,
    'SOFA ATTUALE 1 LUGAR': 694000,
    'SOFA ATTUALE 3 LUGARES': 1128500,
    'SOFA BUGATTI 3 lugares': 1117500,
    'SOFA EVIDENCE 3.02': 1808000,
    'SOFA MAX 2.50m': 1352500,
    'SOFA MURANO 3 lugares': 1121500,
    'SOFA ROYALLE 3 lugares': 979000,
    'SOFA LONDON 7 PARTES': 2990000,
    'SOFA ATHOS': 1990000,
    'SOFA ENCANTO 3 lugares': 1064000,
    'SOFA MEMPHIS 2.52m': 1295000,
    'SOFA PASSION 1 LUGAR': 626500,
    'SOFA MEMPHIS 1 lugar': 683000,
    'PUFF ERUS': 249000,
    'SOFA MURANO 1 lugar': 798000,
    'SOFA EVIDENCE 2.90m': 1709000
  },
  'Super Espuma': {
    'PROMO EURO 80 26CM': 172000,
    'PROMO EURO 100 26CM': 205000,
    'PROMO EURO 140 26CM': 273000,
    'TITANIUM 140 COLCHÓN RESORTE 29CM': 271450,
    'TITANIUM 160 COLCHÓN RESORTE 29CM': 376000,
    'TITANIUM 140 CONJUNTO RESORTE 29CM': 447900,
    'TITANIUM 160 CONJUNTO RESORTE 29CM': 539500,
    'HARMONY 140 COLCHÓN': 280350,
    'HARMONY 160 COLCHÓN': 319400,
    'HARMONY 200 COLCHÓN': 598000,
    'HARMONY 140 CONJUNTO': 448500,
    'HARMONY 160 CONJUNTO': 567450,
    'HARMONY 200 CONJUNTO': 749900,
    'SERRAT 140 COLCHÓN': 495000,
    'SERRAT 160 COLCHÓN': 727500,
    'SERRAT 200 COLCHÓN': 911000,
    'SERRAT 140 CONJUNTO': 664500,
    'SERRAT 160 CONJUNTO': 1023150,
    'SERRAT 200 CONJUNTO': 1232550,
    'NEW PAMPA 80 COLCHÓN': 66450,
    'NEW PAMPA 100 COLCHÓN': 83950,
    'NEW PAMPA 140 COLCHÓN': 127650,
    'JORDÁN 80 COLCHÓN 20CM': 80000,
    'JORDÁN 100 COLCHÓN 20CM': 103300,
    'JORDÁN 140 COLCHÓN 20CM': 145850,
    'TÁMESIS 80 COLCHÓN': 119500,
    'TÁMESIS 100 COLCHÓN': 179250,
    'TÁMESIS 140 COLCHÓN': 224600,
    'NILO 80 COLCHÓN PILLOW 28CM': 215750,
    'NILO 100 COLCHÓN PILLOW 28CM': 320450,
    'NILO 140 COLCHÓN PILLOW 28CM': 413000,
    'LUNA SOFT 80 COLCHÓN 20CM': 105000,
    'LUNA SOFT 100 COLCHÓN 20CM': 175000,
    'LUNA SOFT 140 COLCHÓN 25CM': 223000,
    'PROMO SOMMIER 80 20CM': 129000,
    'PROMO SOMMIER 100 20CM': 149000,
    'PROMO SOMMIER 140 20CM': 189000,
    // Almohadas Super Espuma
    'ALMOHADA SILICONADAS': 22000,
    'ALMOHADA HIPERSOFT': 29000,
    'ALMOHADA CERVICAL (MAPLE)': 25000
  },
  'Piero': {
    // Colchones y Conjuntos Piero
    'LEGRAND RESORTES POCKET CONJUNTO 2 X 2 34CM': 1506750,
    'LEGRAND RESORTES POCKET CONJUNTO 1,60 X 2 34CM': 1307250,
    'LEGRAND RESORTES POCKET CONJUNTO 1,40 X 2 34CM': 1039500,
    'NOVA LINEA ESPUMA CONJUNTO 140 PILLOW': 656250,
    'NOVA LINEA ESPUMA CONJUNTO 160': 882000,
    'SUAVEGOM MERIT CONJUNTO 0.80 24CM': 278300,
    'SUAVEGOM MERIT CONJUNTO 1.00 24CM': 317000,
    'SUAVEGOM MERIT CONJUNTO 1.40 24CM': 427620,
    'SUAVEGOM MERIT CONJUNTO 1.40 C/PILLOW 29CM': 573300,
    'SUAVEGOM MERIT CONJUNTO 1.60 C/PILLOW 29CM': 782250,
    'SUAVEGOM MERIT CONJUNTO 2.00': 942375,
    'SUAVEGOM SPLENDID COLCHON 0.80': 145450,
    'SUAVEGOM SPLENDID COLCHON 1.00': 177750,
    'SUAVEGOM RESORTES OXFORD COLCHON 1,40 29CM': 624750,
    'SUAVEGOM RESORTES OXFORD CONJUNTO 1,40 29CM': 703500,
    'SUAVEGOM RESORTES OXFORD CONJUNTO 1,60 29CM': 939750,
    'SUAVEGOM RESORTES OXFORD CONJUNTO 2,00 29CM': 1123500,
    // Almohadas Piero
    'ALMOHADA CERVICAL (MAPLE)': 32000,
    'ALMOHADA DARLING': 21000,
    'ALMOHADA CUORE': 49000,
    'ALMOHADA SMART TECH': 85000
  },
  'San Jose': {
    'CAMA 1 PL PINO LUSTRADO': 82000,
    'CAMA CUCHETA PINO LUSTRADO': 176000,
    'MESA 80X80 PLEGABLE EUCALIPTUS': 92000,
    'MESA 150X80 PLEGABLE EUCALIPTUS': 149900,
    'SILLAS CURVAS PLEGABLES EUCALIPTUS': 63000,
    'SILLÓN DIRECTOR C/LONA': 74000,
    'MESA DESAYUNADOR EUCALIPTUS': 113000,
    'BANQUETA P/DESAYUNADOR ESCALIPTUS': 82000,
    'COMBO DESAYUNADOR + 4 BANQUETAS': 415800,
    'COMBO MESA 150X80 + 6 SILLONES': 561000,
    'COMBO MESA 80X80 + 4 SILLAS': 286000
  }
};

const PriceUpdateForm: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brandAnalyses, setBrandAnalyses] = useState<BrandAnalysis[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [updateResults, setUpdateResults] = useState<{ updated: number; errors: any[] } | null>(null);

  useEffect(() => {
    loadProducts();
    initializeBrandAnalyses();
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

  const initializeBrandAnalyses = () => {
    const brands = Object.keys(PRICE_DATA);
    const analyses: BrandAnalysis[] = brands.map(brand => ({
      brand,
      totalProducts: Object.keys(PRICE_DATA[brand as keyof typeof PRICE_DATA]).length,
      foundMatches: 0,
      updates: [],
      analyzed: false
    }));
    setBrandAnalyses(analyses);
  };

  const analyzeBrand = (brandName: string) => {
    setAnalyzing(true);
    const brandData = PRICE_DATA[brandName as keyof typeof PRICE_DATA];
    if (!brandData) {
      setAnalyzing(false);
      return;
    }

    // Filtrar productos de la marca seleccionada (solo tabla products de Supabase)
    const brandProducts = products.filter(
      (product) => product.brand.toLowerCase() === brandName.toLowerCase()
    );

    // Normalización y helpers
    const normalizeText = (s: string) =>
      s
        .normalize('NFD')
        // Remover diacríticos con rango Unicode (compatible con ES2015+)
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const tokenize = (s: string) => normalizeText(s).split(' ').filter(Boolean);

    // Estrategia: por cada producto elegir SOLO el mejor precio que coincida por tokens
    const productToUpdate = new Map<number, PriceUpdate>();

    brandProducts.forEach((product) => {
      const pTokens = tokenize(product.name);

      let best: { score: number; priceName: string; newPrice: number } | null = null;

      Object.entries(brandData).forEach(([priceName, newPrice]) => {
        const priceTokens = tokenize(priceName);

        // Reglas de score:
        // - Todas las palabras de priceName deben estar presentes en product.name (AND de tokens)
        // - Bonus si aparece como subcadena con límites de palabra al inicio
        // - Small bonus por longitud (para preferir coincidencias más específicas)

        const allTokensPresent = priceTokens.every((t) => pTokens.includes(t));
        if (!allTokensPresent) return;

        const normPrice = normalizeText(priceName);
        const startsWithWholeWord = new RegExp(`\\b${normPrice.replace(/[-/\\^$*+?.()|[\]{}]/g, '')}\\b`).test(
          normalizeText(product.name)
        );

        let score = 0;
        if (startsWithWholeWord) score += 5;
        // bonus por número de tokens y longitud
        score += Math.min(priceTokens.length, 5);
        score += Math.min(normPrice.length / 5, 5);

        if (!best || score > best.score) {
          best = { score, priceName, newPrice: Number(newPrice) };
        }
      });

      if (best) {
        const chosen = best; // asegurar tipado no-nulo
        productToUpdate.set(product.id, {
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          newPrice: chosen.newPrice,
          brand: product.brand,
          selected: true,
          manuallyModified: false,
        });
      }
    });

    const updates = Array.from(productToUpdate.values());

    // Actualizar el análisis de la marca con resultados deduplicados
    setBrandAnalyses((prev) =>
      prev.map((analysis) =>
        analysis.brand === brandName
          ? { ...analysis, updates, foundMatches: updates.length, analyzed: true }
          : analysis
      )
    );

    setAnalyzing(false);
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

  const updatePriceValue = (brandName: string, productId: number, newPrice: number) => {
    setBrandAnalyses(prev => prev.map(analysis => {
      if (analysis.brand === brandName) {
        const idx = analysis.updates.findIndex(u => u.productId === productId);
        if (idx === -1) return analysis;
        const updatedUpdates = [...analysis.updates];
        updatedUpdates[idx] = {
          ...updatedUpdates[idx],
          newPrice,
          manuallyModified: true,
        };
        return { ...analysis, updates: updatedUpdates };
      }
      return analysis;
    }));
  };

  const toggleProductSelection = (brandName: string, productId: number) => {
    setBrandAnalyses(prev => prev.map(analysis => {
      if (analysis.brand === brandName) {
        const idx = analysis.updates.findIndex(u => u.productId === productId);
        if (idx === -1) return analysis;
        const updatedUpdates = [...analysis.updates];
        updatedUpdates[idx] = {
          ...updatedUpdates[idx],
          selected: !updatedUpdates[idx].selected,
        };
        return { ...analysis, updates: updatedUpdates };
      }
      return analysis;
    }));
  };

  const selectAllProducts = (brandName: string, selectAll: boolean) => {
    setBrandAnalyses(prev => prev.map(analysis => {
      if (analysis.brand === brandName) {
        const updatedUpdates = analysis.updates.map(update => ({
          ...update,
          selected: selectAll
        }));
        return { ...analysis, updates: updatedUpdates };
      }
      return analysis;
    }));
  };

  // Función para filtrar productos según el término de búsqueda
  const getFilteredUpdates = (brandName: string) => {
    const brandAnalysis = brandAnalyses.find(a => a.brand === brandName);
    if (!brandAnalysis) return [];
    
    if (!searchTerm.trim()) return brandAnalysis.updates;
    
    return brandAnalysis.updates.filter(update =>
      update.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const removePriceUpdate = (brandName: string, productId: number) => {
    setBrandAnalyses(prev => prev.map(analysis => {
      if (analysis.brand === brandName) {
        const updatedUpdates = analysis.updates.filter(u => u.productId !== productId);
        return { ...analysis, updates: updatedUpdates, foundMatches: updatedUpdates.length };
      }
      return analysis;
    }));
  };

  const executeUpdatesForBrand = async (brandName: string) => {
    const brandAnalysis = brandAnalyses.find(analysis => analysis.brand === brandName);
    if (!brandAnalysis || brandAnalysis.updates.length === 0) return;

    // Filtrar solo los productos seleccionados
    const selectedUpdates = brandAnalysis.updates.filter(update => update.selected);
    if (selectedUpdates.length === 0) {
      alert('Por favor selecciona al menos un producto para actualizar.');
      return;
    }

    try {
      setLoading(true);
      const updates = selectedUpdates.map(update => ({
        productId: update.productId,
        newPrice: update.newPrice
      }));

      const results = await bulkUpdatePrices(updates);
      setUpdateResults(results);
      
      if (results.updated > 0) {
        await loadProducts(); // Recargar productos
        // Remover solo los productos actualizados de la lista
        setBrandAnalyses(prev => prev.map(analysis => {
          if (analysis.brand === brandName) {
            const remainingUpdates = analysis.updates.filter(update => !update.selected);
            return { 
              ...analysis, 
              updates: remainingUpdates, 
              foundMatches: remainingUpdates.length,
              analyzed: remainingUpdates.length > 0
            };
          }
          return analysis;
        }));
      }
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      setLoading(false);
    }
  };

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
              
              {/* Información */}
              <div className="alert alert-info">
                <h6>📊 Datos disponibles para actualizar:</h6>
                <ul className="mb-0">
                  <li><strong>Mosconi:</strong> {Object.keys(PRICE_DATA.Mosconi).length} productos</li>
                  <li><strong>Demobile:</strong> {Object.keys(PRICE_DATA.Demobile).length} productos</li>
                  <li><strong>Molufan:</strong> {Object.keys(PRICE_DATA.Molufan).length} productos</li>
                  <li><strong>Super Espuma:</strong> {Object.keys(PRICE_DATA['Super Espuma']).length} productos</li>
                  <li><strong>Piero:</strong> {Object.keys(PRICE_DATA.Piero).length} productos</li>
                  <li><strong>San José:</strong> {Object.keys(PRICE_DATA['San Jose']).length} productos</li>
                </ul>
              </div>

              {/* Selector de marca */}
              <div className="mb-4">
                <label className="form-label fw-bold">Seleccionar marca para analizar:</label>
                <select 
                  className="form-select form-select-lg"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  <option value="">-- Seleccionar marca --</option>
                  {brandAnalyses.map(analysis => (
                    <option key={analysis.brand} value={analysis.brand}>
                      {analysis.brand} ({analysis.totalProducts} productos disponibles)
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón de análisis por marca */}
              {selectedBrand && (
                <div className="mb-4">
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={() => analyzeBrand(selectedBrand)}
                    disabled={analyzing || products.length === 0}
                  >
                    {analyzing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Analizando {selectedBrand}...
                      </>
                    ) : (
                      <>🔍 Analizar {selectedBrand}</>
                    )}
                  </button>
                  <small className="text-muted d-block mt-2">
                    Esto buscará coincidencias entre tus productos de {selectedBrand} y los precios actualizados
                  </small>
                </div>
              )}

              {/* Resumen de análisis por marca */}
              <div className="row mb-4">
                {brandAnalyses.map(analysis => (
                  <div key={analysis.brand} className="col-md-4 mb-3">
                    <div className={`card ${analysis.analyzed ? 'border-success' : 'border-secondary'}`}>
                      <div className={`card-header ${analysis.analyzed ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                        <h6 className="mb-0">{analysis.brand}</h6>
                      </div>
                      <div className="card-body">
                        <p className="mb-1">
                          <strong>Productos disponibles:</strong> {analysis.totalProducts}
                        </p>
                        {analysis.analyzed && (
                          <p className="mb-1">
                            <strong>Coincidencias encontradas:</strong> {analysis.foundMatches}
                          </p>
                        )}
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setSelectedBrand(analysis.brand);
                              analyzeBrand(analysis.brand);
                            }}
                            disabled={analyzing}
                          >
                            {analysis.analyzed ? 'Re-analizar' : 'Analizar'}
                          </button>
                          {analysis.analyzed && analysis.foundMatches > 0 && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => executeUpdatesForBrand(analysis.brand)}
                              disabled={loading}
                            >
                              Actualizar ({analysis.updates.filter(u => u.selected).length})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resultados del análisis de la marca seleccionada */}
              {selectedBrand && brandAnalyses.find(a => a.brand === selectedBrand)?.updates && brandAnalyses.find(a => a.brand === selectedBrand)!.updates.length > 0 && (
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">✅ Productos de {selectedBrand} encontrados para actualizar ({brandAnalyses.find(a => a.brand === selectedBrand)?.updates.length})</h5>
                      <div className="d-flex align-items-center">
                        <label className="text-white me-2 mb-0">🔍 Buscar:</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Buscar producto..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ width: '200px' }}
                        />
                        {searchTerm && (
                          <button
                            className="btn btn-sm btn-outline-light ms-2"
                            onClick={() => setSearchTerm('')}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-striped mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={getFilteredUpdates(selectedBrand).length > 0 && getFilteredUpdates(selectedBrand).every(u => u.selected)}
                                onChange={(e) => selectAllProducts(selectedBrand, e.target.checked)}
                              />
                              <span className="ms-2">Seleccionar</span>
                            </th>
                            <th>Producto</th>
                            <th>Precio Actual</th>
                            <th>Precio Nuevo</th>
                            <th>Diferencia</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredUpdates(selectedBrand).map((update) => {
                            const difference = update.newPrice - update.currentPrice;
                            const percentChange = ((difference / update.currentPrice) * 100);
                            
                            return (
                              <tr key={update.productId} className={update.selected ? 'table-success' : ''}>
                                <td>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={update.selected}
                                    onChange={() => toggleProductSelection(selectedBrand, update.productId)}
                                  />
                                </td>
                                <td className="fw-bold">{update.productName}</td>
                                <td>${update.currentPrice.toLocaleString()}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={update.newPrice}
                                    onChange={(e) => updatePriceValue(selectedBrand, update.productId, Number(e.target.value))}
                                    style={{ width: '120px' }}
                                  />
                                </td>
                                <td>
                                  <span className={`badge ${difference >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                    {difference >= 0 ? '+' : ''}${difference.toLocaleString()} 
                                    ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                  </span>
                                </td>
                                <td>
                                  {update.manuallyModified && (
                                    <span className="badge bg-warning text-dark">✏️ Modificado</span>
                                  )}
                                  {update.selected && (
                                    <span className="badge bg-info text-white ms-1">✓ Seleccionado</span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removePriceUpdate(selectedBrand, update.productId)}
                                  >
                                    ❌
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-muted">
                          {brandAnalyses.find(a => a.brand === selectedBrand)?.updates.filter(u => u.selected).length || 0} productos seleccionados de {brandAnalyses.find(a => a.brand === selectedBrand)?.updates.length || 0}
                          {searchTerm && (
                            <span className="ms-2">
                              | Mostrando {getFilteredUpdates(selectedBrand).length} de {brandAnalyses.find(a => a.brand === selectedBrand)?.updates.length || 0} productos
                            </span>
                          )}
                        </small>
                      </div>
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={() => executeUpdatesForBrand(selectedBrand)}
                        disabled={loading || !brandAnalyses.find(a => a.brand === selectedBrand)?.updates.filter(u => u.selected).length}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Actualizando productos seleccionados...
                          </>
                        ) : (
                          <>💾 Actualizar {brandAnalyses.find(a => a.brand === selectedBrand)?.updates.filter(u => u.selected).length || 0} Productos Seleccionados</>
                        )}
                      </button>
                    </div>
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

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceUpdateForm;
