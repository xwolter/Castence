import { X, History, ShieldAlert, CheckCircle, Clock, Calendar } from "lucide-react";

interface PlayerHistoryModalProps {
    nick: string;
    allReports: any[]; // <--- Teraz przyjmujemy całą listę, żeby lepiej filtrować
    onClose: () => void;
}

export default function PlayerHistoryModal({ nick, allReports, onClose }: PlayerHistoryModalProps) {

    // 1. FILTROWANIE (Ignoruje wielkość liter: Steve = steve)
    const history = allReports.filter(r =>
        r.suspectNick.toLowerCase().trim() === nick.toLowerCase().trim()
    ).sort((a, b) => {
        // Sortowanie od najnowszego (bezpieczne dla braku daty)
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
    });

    // 2. STATYSTYKI
    const total = history.length;
    const banned = history.filter(h => h.status === 'banned').length;
    const clean = history.filter(h => h.status === 'clean').length;

    // 3. NOWA LOGIKA ZAUFANIA (Ban = 0%)
    let trustScore = 100;

    if (banned > 0) {
        trustScore = 0; // Jakikolwiek ban = 0% zaufania
    } else if (total > 0) {
        // Jeśli nie ma bana, liczymy procent czystych sprawdzeń
        trustScore = Math.round((clean / total) * 100);
    }

    // Kolor wskaźnika
    let scoreColor = "text-emerald-500";
    let scoreText = "ZAUFANY";

    if (trustScore === 0) {
        scoreColor = "text-red-600";
        scoreText = "KRYTYCZNE";
    } else if (trustScore < 50) {
        scoreColor = "text-orange-500";
        scoreText = "PODEJRZANY";
    } else if (trustScore < 90) {
        scoreColor = "text-yellow-500";
        scoreText = "NEUTRALNY";
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] w-full max-w-2xl rounded-2xl border border-neutral-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* HEADER */}
                <div className="p-6 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                        <div className={`w-14 h-14 rounded-xl border flex items-center justify-center text-2xl shadow-inner ${banned > 0 ? 'bg-red-900/20 border-red-900/50' : 'bg-neutral-900 border-neutral-800'}`}>
                            {banned > 0 ? '💀' : '👤'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{nick}</h2>
                            <div className="flex items-center gap-2 mt-1 text-xs font-mono text-neutral-500">
                                <History className="w-3 h-3" />
                                Kartoteka Gracza
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-neutral-900 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* STATYSTYKI (GRID) */}
                <div className="grid grid-cols-3 border-b border-neutral-800 bg-[#0f0f0f]">
                    <div className="p-4 text-center border-r border-neutral-800">
                        <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Historia</div>
                        <div className="text-xl font-black text-white">{total} <span className="text-xs font-normal text-neutral-600">wpisów</span></div>
                    </div>
                    <div className="p-4 text-center border-r border-neutral-800">
                        <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Recydywa</div>
                        <div className={`text-xl font-black ${banned > 0 ? 'text-red-500' : 'text-neutral-400'}`}>{banned} <span className="text-xs font-normal text-neutral-600">banów</span></div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Poziom Zaufania</div>
                        <div className={`text-xl font-black ${scoreColor}`}>{trustScore}%</div>
                        <div className={`text-[9px] font-bold uppercase tracking-widest ${scoreColor} opacity-70`}>{scoreText}</div>
                    </div>
                </div>

                {/* LISTA ZDARZEŃ */}
                <div className="flex-grow overflow-y-auto p-0 bg-neutral-950/30">
                    <div className="divide-y divide-neutral-800/50">
                        {history.length === 0 ? (
                            <div className="p-10 text-center text-neutral-600 text-sm">Brak danych (błąd wczytywania?).</div>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="p-4 hover:bg-neutral-900/40 transition flex gap-4 items-start group">

                                    {/* Ikona Statusu */}
                                    <div className="mt-1">
                                        {item.status === 'banned' && <ShieldAlert className="w-5 h-5 text-red-500" />}
                                        {item.status === 'clean' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                        {(item.status === 'pending' || !item.status) && <Clock className="w-5 h-5 text-yellow-500" />}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-bold ${item.status === 'banned' ? 'text-red-400' : 'text-neutral-300'}`}>
                                                {item.status === 'banned' ? 'ZBANOWANY' : item.status === 'clean' ? 'CZYSTY' : 'OCZEKUJE'}
                                            </span>
                                            <span className="text-[10px] text-neutral-600 flex items-center gap-1 font-mono">
                                                <Calendar className="w-3 h-3" />
                                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : 'Brak daty'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/50 p-2.5 rounded border border-neutral-800/50 mt-2 whitespace-pre-wrap">
                                            {item.description || "Brak opisu."}
                                        </p>

                                        <div className="flex justify-between items-center mt-3">
                                            <div className="text-[10px] text-neutral-600">
                                                Sprawdzał: <span className="text-neutral-400 font-bold">{item.checkerNick}</span>
                                            </div>
                                            {item.discordId && (
                                                <div className="text-[10px] font-mono text-indigo-400/70 bg-indigo-900/10 px-1.5 py-0.5 rounded border border-indigo-900/20">
                                                    DC: {item.discordId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}