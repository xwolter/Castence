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
                // Próba ze starym User-Agentem, o który prosiłeś - czasem omija nowsze zabezpieczenia
                'User-Agent': "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.4; en-US; rv:1.9.2.2) Gecko/20100316 Firefox/3.6.2",
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                // Udajemy wejście z Google
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

        // Logowanie statusu dla debugowania w panelu Vercel
        console.log(`📡 Status odpowiedzi API: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            // Logujemy początek błędu, żeby zobaczyć czy to znowu HTML Cloudflare
            const errorText = await res.text();
            console.error(`❌ Błąd API Rotify (Body Preview): ${errorText.substring(0, 500)}...`);
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
