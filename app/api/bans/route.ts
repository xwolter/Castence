import { NextResponse } from 'next/server';

// CAŁKOWITE WYŁĄCZENIE CACHE VERCEL
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
    const API_URL = "https://api.rotify.pl/api/v1/castplay/bans?access=tI9P4VQPd3miL9f4";

    try {
        const res = await fetch(API_URL, {
            cache: 'no-store', // Kluczowe dla fetch
            next: { revalidate: 0 }, // Kluczowe dla Next.js
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        if (!res.ok) {
            console.error(`❌ Błąd API Rotify: ${res.status} ${res.statusText}`);
            // Zwracamy pustą tablicę zamiast błędu 500, żeby strona działała (pokaże tylko lokalne bany)
            return NextResponse.json([], { status: 200 }); 
        }

        const data = await res.json();
        
        // Obsługa różnych formatów odpowiedzi API (tablica lub obiekt { data: [] })
        const bansList = Array.isArray(data) ? data : (data.data || []);
        
        return NextResponse.json(bansList, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            }
        });

    } catch (error) {
        console.error("❌ Krytyczny błąd fetchowania banów:", error);
        return NextResponse.json([], { status: 200 });
    }
}
