import Link from "next/link";
import { Siren, ArrowRight, Skull } from "lucide-react";

interface WantedWidgetProps {
    count: number; // Liczba poszukiwanych
}

export default function WantedWidget({ count }: WantedWidgetProps) {
    return (
        <div className="relative bg-[#0f0f0f] p-6 rounded-xl border border-red-900/30 overflow-hidden group hover:border-red-900/60 transition-all duration-300 shadow-lg shadow-red-900/5">

            {/* TŁO - SYRENA (Efekt wizualny) */}
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 rotate-12">
                <Siren className="w-32 h-32 text-red-500" />
            </div>

            {/* NAGŁÓWEK */}
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        List Gończy
                    </h2>
                </div>

                {/* LICZNIK */}
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-white tracking-tight">
                        {count}
                    </span>
                    <span className="text-xs font-bold text-neutral-500 uppercase">
                        {count === 1 ? "Podejrzany" : "Podejrzanych"}
                    </span>
                </div>

                <p className="text-[10px] text-neutral-400 mb-5 leading-relaxed">
                    Lista graczy oznaczonych jako krytyczni lub do obserwacji. Sprawdź ich w pierwszej kolejności.
                </p>

                {/* PRZYCISK */}
                <Link
                    href="/wanted"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition shadow-lg shadow-red-900/20 group-hover:shadow-red-900/40"
                >
                    <Skull className="w-3.5 h-3.5" />
                    Otwórz Listę
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}