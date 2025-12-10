// app/api/proxy/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Pobieramy parametry z zapytania (page, size, itp.)
    const page = searchParams.get('page') || '0';
    const size = searchParams.get('size') || '1000';
    const access = "tI9P4VQPd3miL9f4"; // Twój klucz API (najlepiej dać do .env)

    // Budujemy docelowy URL
    const targetUrl = `https://api.rotify.pl/api/v1/castplay/bans?access=${access}&page=${page}&size=${size}`;

    try {
        const res = await fetch(targetUrl, {
            headers: {
                // Ważne: Udajemy zwykłą przeglądarkę, żeby ominąć blokady botów
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                // Usuwamy nagłówki, które mogą zdradzać, że to zapytanie z innej strony
                'Accept': 'application/json',
            },
            // Wyłączamy cache dla świeżych danych
            cache: 'no-store'
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `API Rotify zwróciło błąd: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json(
            { error: 'Wewnętrzny błąd serwera Proxy' },
            { status: 500 }
        );
    }
}