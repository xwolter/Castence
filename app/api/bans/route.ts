import { NextResponse } from 'next/server';

// Wymuszenie dynamiki i braku cache'u Vercel
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const API_URL = "https://api.rotify.pl/api/v1/castplay/bans?access=tI9P4VQPd3miL9f4";

    try {
        console.log("🔄 Próba połączenia z API Rotify (Vercel Proxy)...");

        const res = await fetch(API_URL, {
            cache: 'no-store',
            headers: {
                // Zmieniamy nagłówki, aby ominąć proste blokady WAF
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
                // Dodajemy Referer, często API wpuszczają ruch "z Google" lub "z siebie"
                'Referer': 'https://www.google.com/',
                'Origin': 'https://www.google.com',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

        // Logowanie statusu dla debugowania w panelu Vercel
        console.log(`📡 Status odpowiedzi API: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            // Jeśli nadal 403, to znaczy że banują całą pulę IP Vercela
            const errorText = await res.text();
            console.error(`❌ Błąd API Rotify Body: ${errorText}`);
            return NextResponse.json([], { status: 200 }); 
        }

        const data = await res.json();
        
        const count = Array.isArray(data) ? data.length : (data.data?.length || 0);
        console.log(`✅ Pobranno ${count} banów.`);

        const bansList = Array.isArray(data) ? data : (data.data || []);
        
        return NextResponse.json(bansList, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error("❌ Krytyczny błąd fetchowania banów:", error);
        return NextResponse.json([], { status: 200 });
    }
}
