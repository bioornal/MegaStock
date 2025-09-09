import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy to fetch Google Sheets CSV and bypass browser CORS
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Basic validation: only allow docs.google.com sheet export URLs
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('google.com') || !parsed.hostname.includes('docs.google.com')) {
      return NextResponse.json({ error: 'Only Google Sheets URLs are allowed' }, { status: 400 });
    }

    // Fetch CSV from Google with redirects followed
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        // Hint we want CSV; Google honors the export params in the URL itself
        'accept': 'text/csv, text/plain;q=0.9, */*;q=0.8',
      },
      // No credentials; this must be a publicly accessible export URL
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { error: `Failed to fetch sheet (HTTP ${response.status})`, details: text?.slice(0, 500) },
        { status: 502 }
      );
    }

    // Stream CSV back to the client
    const csv = await response.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy error', details: String(err?.message || err) }, { status: 500 });
  }
}
