import { NextResponse } from 'next/server';

// To wymusza na Vercelu brak cache'owania tego endpointu
export const dynamic = 'force-dynamic';

export async function GET() {
    const API_URL = "https://api.rotify.pl/api/v1/castplay/bans?access=tI9P4VQPd3miL9f4";

    try {
        const res = await fetch(API_URL, {
            cache: 'no-store', // Ważne: Zawsze pobieraj świeże dane
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`❌ Błąd API Rotify: ${res.status} ${res.statusText}`);
            return NextResponse.json([], { status: 200 }); 
        }

        const data = await res.json();
        
        // Obsługa różnych formatów odpowiedzi
        const bansList = Array.isArray(data) ? data : (data.data || []);
        
        return NextResponse.json(bansList);

    } catch (error) {
        console.error("❌ Krytyczny błąd fetchowania banów:", error);
        return NextResponse.json([], { status: 200 });
    }
}
