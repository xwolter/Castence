"use client";
import { X, History, ShieldAlert, CheckCircle, Clock, Calendar, ExternalLink, Copy, User } from "lucide-react";
import { useState } from "react";

interface PlayerHistoryModalProps {
    nick: string;
    allReports: any[];
    onClose: () => void;
}

export default function PlayerHistoryModal({ nick, allReports, onClose }: PlayerHistoryModalProps) {
    const [copied, setCopied] = useState(false);

    // 1. FILTROWANIE (Ignoruje wielkość liter i spacje)
    const history = (allReports || []).filter(r =>
        r.suspectNick?.toLowerCase().trim() === nick.toLowerCase().trim()
    ).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
    });

    // 2. STATYSTYKI
    const total = history.length;
    const banned = history.filter(h => h.status === 'banned').length;
    const clean = history.filter(h => h.status === 'clean').length;
    const pending = history.filter(h => h.status === 'pending' || !h.status).length;

    // 3. LOGIKA ZAUFANIA (Poprawiona)
    let trustScore = 100;

    // Obliczamy tylko na podstawie zakończonych spraw (Clean vs Banned)
    // Żeby "Oczekujące" nie zaniżały sztucznie wyniku
    const resolvedCount = banned + clean;

    if (banned > 0) {
        trustScore = 0; // Jakikolwiek ban = Skreślony
    } else if (resolvedCount > 0) {
        trustScore = Math.round((clean / resolvedCount) * 100);
    }
    // Jeśli są same "Oczekujące" (resolvedCount == 0), zostawiamy 100% (Domniemanie niewinności)

    // Kolory i teksty
    let scoreColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    let scoreText = "ZAUFANY";

    if (trustScore === 0) {
        scoreColor = "text-red-500 border-red-500/20 bg-red-500/10";
        scoreText = "KRYTYCZNE";
    } else if (trustScore < 90) {
        scoreColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
        scoreText = "NEUTRALNY";
    }

    const copyNick = () => {
        navigator.clipboard.writeText(nick);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] w-full max-w-4xl rounded-2xl border border-neutral-800 shadow-2xl flex flex-col md:flex-row max-h-[85vh] overflow-hidden">

                {/* --- LEWA KOLUMNA: PROFIL --- */}
                <div className="w-full md:w-1/3 bg-[#0f0f0f] border-r border-neutral-800 p-6 flex flex-col items-center relative">

                    <button onClick={onClose} className="absolute right-4 top-4 md:hidden text-neutral-500"><X /></button>

                    {/* SKIN */}
                    <div className="relative w-40 h-72 mb-6 transition-transform hover:scale-105 duration-500 cursor-pointer">
                        <div className="absolute bottom-0 w-24 h-4 bg-black/50 blur-xl left-1/2 -translate-x-1/2 rounded-full"></div>
                        <img
                            src={`https://visage.surgeplay.com/full/512/${nick}`}
                            alt={nick}
                            className="w-full h-full object-contain drop-shadow-2xl"
                            onError={(e) => { e.currentTarget.src = "https://visage.surgeplay.com/full/512/MHF_Steve" }}
                        />
                    </div>

                    {/* NICK */}
                    <h2 className="text-2xl font-black text-white tracking-tight mb-1">{nick}</h2>
                    <button
                        onClick={copyNick}
                        className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-white transition uppercase font-bold tracking-wider mb-6 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800"
                    >
                        {copied ? <CheckCircle className="w-3 h-3 text-emerald-500"/> : <Copy className="w-3 h-3"/>}
                        {copied ? "Skopiowano" : "Kopiuj Nick"}
                    </button>

                    {/* WSKAŹNIK */}
                    <div className={`w-full py-4 rounded-xl border flex flex-col items-center justify-center mb-4 ${scoreColor}`}>
                        <span className="text-3xl font-black tracking-tighter">{trustScore}%</span>
                        <span className="text-[9px] uppercase font-bold tracking-[0.2em] opacity-80">{scoreText}</span>
                    </div>

                    <a
                        href={`https://pl.namemc.com/search?q=${nick}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 transition group"
                    >
                        <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:text-white" />
                        Sprawdź na NameMC
                    </a>
                </div>

                {/* --- PRAWA KOLUMNA: HISTORIA --- */}
                <div className="w-full md:w-2/3 flex flex-col bg-[#0a0a0a]">

                    <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <History className="w-5 h-5 text-neutral-500" />
                                Historia Sprawdzeń
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">Wszystkie zgłoszenia powiązane z tym nickiem.</p>
                        </div>
                        <button onClick={onClose} className="hidden md:block p-2 bg-neutral-900 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* STATYSTYKI SZCZEGÓŁOWE */}
                    <div className="grid grid-cols-3 border-b border-neutral-800 bg-[#0f0f0f]">
                        <div className="p-4 text-center border-r border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Czysty</div>
                            <div className="text-lg font-black text-emerald-500">{clean}</div>
                        </div>
                        <div className="p-4 text-center border-r border-neutral-800">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Bany</div>
                            <div className="text-lg font-black text-red-500">{banned}</div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Oczekuje</div>
                            <div className="text-lg font-black text-yellow-500">{pending}</div>
                        </div>
                    </div>

                    {/* LISTA WPISÓW */}
                    <div className="flex-grow overflow-y-auto p-0">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-50 space-y-2">
                                <User className="w-12 h-12" />
                                <p className="text-sm font-medium">Brak wpisów w kartotece.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-800/50">
                                {history.map((item) => (
                                    <div key={item.id} className="p-5 hover:bg-neutral-900/40 transition flex gap-4 items-start group">

                                        {/* Ikona Statusu */}
                                        <div className="mt-1 flex-shrink-0">
                                            {item.status === 'banned' && <div className="p-2 bg-red-900/20 rounded-lg"><ShieldAlert className="w-5 h-5 text-red-500" /></div>}
                                            {item.status === 'clean' && <div className="p-2 bg-emerald-900/20 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>}
                                            {(item.status === 'pending' || !item.status) && <div className="p-2 bg-yellow-900/20 rounded-lg"><Clock className="w-5 h-5 text-yellow-500" /></div>}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <span className={`text-xs font-black uppercase tracking-wider ${item.status === 'banned' ? 'text-red-400' : item.status === 'clean' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                                        {item.status === 'banned' ? 'ZBANOWANY' : item.status === 'clean' ? 'CZYSTY' : 'OCZEKUJE'}
                                                    </span>
                                                    <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : '-'}</span>
                                                        <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                                                        <span>Admin: <b className="text-neutral-400">{item.checkerNick}</b></span>
                                                    </div>
                                                </div>

                                                {item.evidenceLink && (
                                                    <a href={item.evidenceLink} target="_blank" className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-neutral-400 hover:text-white hover:border-neutral-600 transition flex items-center gap-1 whitespace-nowrap">
                                                        <ExternalLink className="w-3 h-3" /> Dowód
                                                    </a>
                                                )}
                                            </div>

                                            <div className="mt-3 bg-[#121212] p-3 rounded-lg border border-neutral-800/50 text-xs text-neutral-300 font-normal leading-relaxed whitespace-pre-wrap">
                                                {item.description || <span className="text-neutral-600 italic">Brak opisu zdarzenia.</span>}
                                            </div>

                                            {item.discordId && (
                                                <div className="mt-2 inline-flex items-center gap-1 text-[9px] text-indigo-400/60 bg-indigo-950/10 px-1.5 py-0.5 rounded border border-indigo-900/10">
                                                    DC: {item.discordId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}