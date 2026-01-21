// Lightweight Google Sheets CSV fetcher and parser
// Supports public sheets by converting to CSV export URL

export interface SheetRow {
  [key: string]: string | number;
}

export interface ParsedSheet {
  headers: string[];
  rows: SheetRow[];
}

// Convert a Google Sheets URL to a CSV export URL
// Examples supported:
// - https://docs.google.com/spreadsheets/d/<id>/edit#gid=<gid>
// - https://docs.google.com/spreadsheets/d/<id>/view?gid=<gid>
// - https://docs.google.com/spreadsheets/d/<id>
export function toGoogleCsvUrl(inputUrl: string): string | null {
  try {
    const url = new URL(inputUrl);
    if (!url.hostname.includes('docs.google.com')) return null;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const dIndex = pathParts.findIndex((p) => p === 'd');
    if (dIndex === -1 || dIndex + 1 >= pathParts.length) return null;
    const sheetId = pathParts[dIndex + 1];

    // Extract gid if present
    let gid: string | null = url.searchParams.get('gid');
    if (!gid && url.hash) {
      const hash = url.hash.replace('#', '');
      const params = new URLSearchParams(hash);
      gid = params.get('gid');
    }

    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
    exportUrl.searchParams.set('format', 'csv');
    if (gid !== null) exportUrl.searchParams.set('gid', gid);
    return exportUrl.toString();
  } catch (e) {
    return null;
  }
}

// Fetch CSV text from a Google Sheets URL (publicly shared)
export async function fetchGoogleSheetCsv(inputUrl: string, fetcher: typeof fetch = fetch): Promise<string> {
  const csvUrl = toGoogleCsvUrl(inputUrl);
  if (!csvUrl) throw new Error('URL de Google Sheets no válida. Asegúrate de pegar el enlace correcto.');

  // On the browser, use our server-side proxy to bypass CORS and Google login redirects
  const isBrowser = typeof window !== 'undefined';
  const target = isBrowser ? `/api/sheets/proxy?url=${encodeURIComponent(csvUrl)}` : csvUrl;

  const res = await fetcher(target, { cache: 'no-store', redirect: 'follow' as RequestRedirect });
  if (!res.ok) throw new Error(`No se pudo descargar la planilla (HTTP ${res.status}). Verifica que el enlace sea público ("Cualquiera con el enlace").`);

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  const looksLikeLoginHtml = contentType.includes('text/html') && /<form[^>]*action=["']?https?:\/\/accounts\.google\.com\//i.test(text);
  if (looksLikeLoginHtml) {
    throw new Error('Google requiere inicio de sesión para esa planilla. Cámbiala a "Cualquiera con el enlace (lector)" o exporta una vista pública.');
  }
  return text;
}

// Helper to smartly parse integers relative to currency formats
// Prioritizes dropping decimals and handling thousands separators correctly
// Uses heuristic: if separator is followed by exactly 3 digits, it's thousands; otherwise decimal
export function smartParseInt(val: string | number): number {
  if (typeof val === 'number') return Math.floor(val);
  if (!val) return NaN;

  let strVal = val.toString().trim();

  // IMPORTANT: If the value contains letters (A-Z, a-z, or accented chars like á, é, ü),
  // it's clearly NOT a number - return NaN immediately.
  // This prevents "BAÚL BERLIM 1,40" from being parsed as "1" or "140"
  const hasLetters = /[a-zA-Z\u00C0-\u024F]/.test(strVal);
  if (hasLetters) {
    return NaN;
  }

  // Remove currency symbols and other non-numeric chars except . , -
  strVal = strVal.replace(/[^0-9.,-]/g, '');

  if (!strVal) return NaN;

  let numStr = strVal;

  const lastDotIdx = numStr.lastIndexOf('.');
  const lastCommaIdx = numStr.lastIndexOf(',');

  if (lastDotIdx > -1 && lastCommaIdx > -1) {
    // Both separators present: Determine which is decimal based on position (formatting is consistent)
    if (lastDotIdx > lastCommaIdx) {
      // ... , ... . XX -> Dot is decimal (US style with comma thousands)
      // Cut at dot, remove comas
      numStr = numStr.substring(0, lastDotIdx).replace(/,/g, '');
    } else {
      // ... . ... , XX -> Comma is decimal (EU/AR style with dot thousands)
      // Cut at comma, remove dots
      numStr = numStr.substring(0, lastCommaIdx).replace(/\./g, '');
    }
  } else if (lastDotIdx > -1) {
    // Only dots
    const afterDot = numStr.substring(lastDotIdx + 1);
    // Heuristic: If followed by exactly 3 digits, assume thousands separator.
    // Unless there's only ONE dot and it's a small number? No, consistency is better.
    // Exception: If Google Sheets exports "232588.5", it has 1 digit after dot. It is DECIMAL.
    // If it exports "1.500", it has 3. It is THOUSANDS (usually).
    if (afterDot.length === 3) {
      // Likely thousands separator
      numStr = numStr.replace(/\./g, '');
    } else {
      // Likely decimal separator (e.g. .5, .50, .00, .1234)
      numStr = numStr.substring(0, lastDotIdx);
    }
  } else if (lastCommaIdx > -1) {
    // Only commas
    const afterComma = numStr.substring(lastCommaIdx + 1);
    if (afterComma.length === 3) {
      // Likely thousands (uncommon but possible in some formats)
      numStr = numStr.replace(/,/g, '');
    } else {
      // Likely decimal
      numStr = numStr.substring(0, lastCommaIdx);
    }
  }

  const num = parseInt(numStr, 10);
  return isNaN(num) ? NaN : num;
}

// Very small CSV parser (handles quoted values and commas)
export function parseCsv(csvText: string): ParsedSheet {
  const rows: string[][] = [];
  let i = 0;
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => { current.push(field); field = ''; };
  const pushRow = () => { rows.push(current); current = []; };

  while (i < csvText.length) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') { // escaped quote
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { pushField(); i++; continue; }
      if (ch === '\n') { pushField(); pushRow(); i++; continue; }
      if (ch === '\r') { // handle CRLF\r\n
        // lookahead for \n
        if (csvText[i + 1] === '\n') { i += 2; } else { i++; }
        pushField(); pushRow();
        continue;
      }
      field += ch; i++; continue;
    }
  }
  // last field/row
  pushField();
  if (current.length > 1 || (current.length === 1 && current[0] !== '')) pushRow();

  if (rows.length === 0) return { headers: [], rows: [] };

  // Find the most likely header row
  const headerKeywords = ['articulo', 'artículo', 'producto', 'descripcion', 'descripción', 'modelo', 'web', 'unitario', 'precio', 'price', 'valor', 'monto'];
  const norm = (s: string) => s
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  let headerIndex = -1;
  // 1) Any row that contains a known header keyword
  for (let i = 0; i < rows.length; i++) {
    const candidate = rows[i];
    if (candidate.some(cell => headerKeywords.includes(norm(String(cell || ''))))) {
      headerIndex = i;
      break;
    }
  }
  // 2) Fallback: first row with at least two non-empty cells
  if (headerIndex === -1) {
    for (let i = 0; i < rows.length; i++) {
      const candidate = rows[i];
      const filled = candidate.filter(cell => (String(cell || '').trim() !== ''));
      if (filled.length >= 2) { headerIndex = i; break; }
    }
  }
  // 3) Fallback: first non-empty row
  if (headerIndex === -1) {
    for (let i = 0; i < rows.length; i++) {
      const candidate = rows[i];
      const hasContent = candidate.some(cell => (cell || '').trim() !== '');
      if (hasContent) { headerIndex = i; break; }
    }
  }
  if (headerIndex === -1) return { headers: [], rows: [] };

  // Normalize headers: trim and strip BOM
  const headers = rows[headerIndex].map(h => (h || '').replace(/^\uFEFF/, '').trim());
  const dataRows = rows.slice(headerIndex + 1);

  const parsedRows: SheetRow[] = dataRows
    .filter(r => r.some(cell => (cell || '').trim() !== '')) // skip empty lines
    .map(r => {
      const obj: SheetRow = {};
      headers.forEach((h, idx) => {
        const rawVal = (r[idx] ?? '').toString().trim();
        // Intentar parsear como número usando lógica inteligente
        const parsedNum = smartParseInt(rawVal);

        if (!isNaN(parsedNum)) {
          obj[h] = parsedNum;
        } else {
          obj[h] = rawVal;
        }
      });
      return obj;
    });

  return { headers, rows: parsedRows };
}

export interface SheetPriceEntry {
  brand: string;
  name: string;
  price: number;
}

// Map parsed sheet to expected price entries by guessing common headers
// Looks for headers like: brand/marca, name/producto/modelo, price/web/precio/valor/unitario
export function mapSheetToPrices(sheet: ParsedSheet): { entries: SheetPriceEntry[]; warnings: string[] } {
  const headers = sheet.headers.map(h => h.toLowerCase());

  const findHeader = (candidates: string[]) => {
    const idx = headers.findIndex(h => candidates.includes(h));
    return idx >= 0 ? sheet.headers[idx] : null;
  };

  const brandHeader = findHeader(['brand', 'marca']);
  const nameHeader = findHeader(['name', 'producto', 'modelo', 'descripcion', 'descripción']);
  const priceHeader = findHeader(['web', 'price', 'precio', 'valor', 'monto', 'unitario']);

  const warnings: string[] = [];
  if (!brandHeader) warnings.push('No se encontró columna de Marca (brand/marca).');
  if (!nameHeader) warnings.push('No se encontró columna de Nombre (name/producto/modelo).');
  if (!priceHeader) warnings.push('No se encontró columna de Precio (web/price/precio/valor/unitario).');

  const entries: SheetPriceEntry[] = [];
  for (const row of sheet.rows) {
    const brand = String(row[brandHeader ?? ''] ?? '').toString().trim();
    const name = String(row[nameHeader ?? ''] ?? '').toString().trim();
    const rawPrice = row[priceHeader ?? ''];

    // Usar smartParseInt también aquí por seguridad (aunque parseCsv ya debería haberlo hecho)
    // Esto maneja casos donde rawPrice todavía sea string (ej. formato raro ignorado previamente)
    const price = smartParseInt(rawPrice as string | number);

    if (!brand || !name || Number.isNaN(price)) continue;
    entries.push({ brand, name, price });
  }

  return { entries, warnings };
}
