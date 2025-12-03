// src/app/api/bans/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
    // Twój URL z kluczem dostępu
    const API_URL = "https://api.rotify.pl/api/v1/castplay/bans?access=tI9P4VQPd3miL9f4";

    try {
        const res = await fetch(API_URL, {
            next: { revalidate: 15 }, // Cache na 30 sekund
        });

        if (!res.ok) {
            console.error(`Błąd API Rotify: ${res.status}`);
            return NextResponse.json([], { status: 200 }); // Zwracamy pustą tablicę zamiast błędu, żeby frontend działał
        }

        const data = await res.json();

        // Sprawdzenie czy data jest tablicą, czasem API zwraca { data: [...] }
        const bansList = Array.isArray(data) ? data : (data.data || []);

        return NextResponse.json(bansList);

    } catch (error) {
        console.error("Błąd fetchowania banów:", error);
        return NextResponse.json([], { status: 200 });
    }
}