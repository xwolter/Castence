// Definiujemy typy
interface PinWidgetProps {
    userPin: string | null;
    onClaim: () => void;
    onCopy: (text: string) => void;
}

export default function PinWidget({ userPin, onClaim, onCopy }: PinWidgetProps) {
    return (
        <div className="bg-neutral-900 p-5 rounded border border-neutral-800 relative overflow-hidden">
            {/* BLOKADA WIDOKU */}
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-4">
                <span className="text-2xl mb-2 opacity-50">🔒</span>
                <h3 className="text-red-500 font-bold uppercase tracking-widest text-xs">Moduł Wyłączony</h3>
                <p className="text-neutral-500 text-[10px] mt-1">Generowanie kodów jest tymczasowo niedostępne.</p>
            </div>

            {/* TREŚĆ (ROZMYTA) */}
            <div className="opacity-20 pointer-events-none filter blur-[1px]">
                <h2 className="text-xs font-bold text-neutral-500 uppercase mb-3 tracking-wider">Twój Ocean PIN</h2>
                {userPin ? (
                    <div className="flex flex-col gap-2">
                        <div
                            // Dodałem obsługę kliknięcia, żeby kopiowanie działało (jak włączysz moduł)
                            onClick={() => userPin && onCopy(userPin)}
                            className="bg-neutral-950 border border-neutral-700 border-dashed rounded p-3 text-center cursor-pointer hover:border-emerald-500 transition"
                        >
                            <span className="font-mono text-sm font-bold tracking-widest block">{userPin}</span>
                        </div>
                        <p className="text-[10px] text-center text-neutral-600">Kliknij kod aby skopiować</p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xs text-neutral-500 mb-3">Odbierz swój klucz licencyjny.</p>
                        <button
                            onClick={onClaim}
                            className="w-full py-2 bg-blue-900/20 text-blue-400 border border-blue-900/50 rounded text-xs font-bold"
                        >
                            Odbierz Kod
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}