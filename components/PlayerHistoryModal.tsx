'use client';
import {
    X, History, ShieldAlert, CheckCircle, Clock, Calendar,
    ExternalLink, Copy, User, Fingerprint, Users, StickyNote, Save,
    Terminal, Swords, Ban, Check, VolumeX, Search
} from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PlayerHistoryModalProps {
    nick: string;
    allReports: any[];
    currentUser: any; // Może być null/undefined, co wymaga bezpiecznego dostępu
    onClose: () => void;
}

export default function PlayerHistoryModal({ nick, allReports, currentUser, onClose }: PlayerHistoryModalProps) {
    const [copied, setCopied] = useState(false);
    const [nameHistory, setNameHistory] = useState<any[]>([]);
    const [uuid, setUuid] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [accountType, setAccountType] = useState<'premium' | 'cracked' | 'loading'>('loading');

    // STANY NOTATKI
    const [noteContent, setNoteContent] = useState("");
    const [noteAuthor, setNoteAuthor] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    // 1. POBIERANIE DANYCH (MOJANG API & BAZA)
    useEffect(() => {
        const fetchData = async () => {
            setLoadingHistory(true);
            try {
                // A) API ASHCON
                const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${nick}`);

                if (res.ok) {
                    const data = await res.json();
                    setUuid(data.uuid);
                    setAccountType('premium');

                    if (data.username_history && Array.isArray(data.username_history)) {
                        setNameHistory(data.username_history.reverse());
                    } else {
                        setNameHistory([{ username: data.username }]);
                    }
                } else {
                    setAccountType('cracked');
                    setUuid(null);
                    setNameHistory([{ username: nick }]);
                }

                // B) NOTATKA Z BAZY
                const noteRef = doc(db, "player_notes", nick.toLowerCase());
                const noteSnap = await getDoc(noteRef);
                if (noteSnap.exists()) {
                    setNoteContent(noteSnap.data().content || "");
                    setNoteAuthor(noteSnap.data().lastEditedBy || "");
                }

            } catch (e) {
                console.error("Błąd API:", e);
                setAccountType('cracked');
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchData();
    }, [nick]);

    const handleSaveNote = async () => {
        setIsSavingNote(true);
        try {
            const noteRef = doc(db, "player_notes", nick.toLowerCase());
            // Zabezpieczenie przed brakiem currentUser
            const lastEditedBy = currentUser?.displayName || "Admin";

            await setDoc(noteRef, {
                content: noteContent,
                lastEditedBy: lastEditedBy,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setNoteAuthor(lastEditedBy);
        } catch (e) { alert("Błąd zapisu notatki."); }
        setIsSavingNote(false);
    };

    // --- LOGIKA HISTORII ---
    const history = (allReports || []).filter(r =>
        r.suspectNick?.toLowerCase().trim() === nick.toLowerCase().trim()
    ).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    // --- DANE STATYSTYCZNE ---
    const totalReports = history.length;
    const bannedCount = history.filter(h => h.status === 'banned').length;
    const cleanCount = history.filter(h => h.status === 'clean').length;
    const lastAction = history[0];

    // Ostatni ban
    const lastBan = history.find(h => h.status === 'banned');
    const daysSinceBan = lastBan?.createdAt?.toDate
        ? Math.floor((new Date().getTime() - lastBan.createdAt.toDate().getTime()) / (1000 * 3600 * 24))
        : null;

    // Zaufanie
    let trustScore = 100;
    const resolvedCount = bannedCount + cleanCount;
    if (bannedCount > 0) trustScore = 0;
    else if (resolvedCount > 0) trustScore = Math.round((cleanCount / resolvedCount) * 100);

    let scoreColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    let scoreText = "ZAUFANY";
    if (trustScore === 0) { scoreColor = "text-red-500 border-red-500/20 bg-red-500/10"; scoreText = "KRYTYCZNE"; }
    else if (trustScore < 90) { scoreColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/10"; scoreText = "PODEJRZANY"; }

    // --- DETEKTOR MULTIKONT ---
    const knownDiscordId = history.find(h => h.discordId)?.discordId;
    const altAccounts = knownDiscordId
        ? Array.from(new Set((allReports || [])
            .filter(r => r.discordId === knownDiscordId && r.suspectNick.toLowerCase() !== nick.toLowerCase())
            .map(r => r.suspectNick)))
        : [];

    // --- KOPIOWANIE ---
    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Generowanie komend
    const copyBanCommand = () => {
        const cmd = `/ban ${nick} cheaty`;
        copyText(cmd);
        alert(`Skopiowano komendę: ${cmd}`);
    };

    const copyTempBanCommand = (days: number) => {
        const cmd = `/tempban ${nick} ${days}d Przyznanie się`;
        copyText(cmd);
        alert(`Skopiowano komendę: ${cmd}`);
    };

    // NOWE KOMENDY
    const copyMuteCommand = () => {
        const cmd = `/mute ${nick} 30m Obraza`;
        copyText(cmd);
        alert(`Skopiowano komendę: ${cmd}`);
    };

    const copyCheckCommand = () => {
        const cmd = `/sprawdz ${nick}`;
        copyText(cmd);
        alert(`Skopiowano komendę: ${cmd}`);
    };


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] w-full max-w-6xl rounded-2xl border border-neutral-800 shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden">

                {/* ================= LEWA KOLUMNA: PROFIL ================= */}
                <div className="w-full md:w-[30%] bg-[#0f0f0f] border-r border-neutral-800 p-6 flex flex-col relative overflow-y-auto custom-scrollbar">
                    <button onClick={onClose} className="absolute right-4 top-4 md:hidden text-neutral-500"><X /></button>

                    {/* TYP KONTA BADGE */}
                    <div className="absolute top-4 left-4">
                        {accountType === 'premium' && <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-[9px] font-bold border border-emerald-800 rounded uppercase tracking-wider">Premium</span>}
                        {accountType === 'cracked' && <span className="px-2 py-1 bg-red-900/30 text-red-400 text-[9px] font-bold border border-red-800 rounded uppercase tracking-wider">Non-Premium</span>}
                    </div>

                    {/* SKIN 3D */}
                    <div className="flex flex-col items-center mb-6 mt-6">
                        <div className="relative w-32 h-60 mb-4 transition-transform hover:scale-105 duration-500 cursor-pointer group">
                            <div className="absolute bottom-0 w-20 h-3 bg-black/60 blur-xl left-1/2 -translate-x-1/2 rounded-full"></div>
                            <img
                                src={`https://visage.surgeplay.com/full/512/${nick}`}
                                alt={nick}
                                className="w-full h-full object-contain drop-shadow-2xl relative z-10"
                                onError={(e) => { e.currentTarget.src = "https://visage.surgeplay.com/full/512/MHF_Steve" }}
                            />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{nick}</h2>

                        {/* PRZYCISKI KOPIOWANIA */}
                        <div className="flex gap-2 mt-4 w-full">
                            <button onClick={() => copyText(nick)} className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition flex justify-center items-center gap-2">
                                <Copy className="w-3 h-3" /> NICK
                            </button>
                            {uuid && (
                                <button onClick={() => copyText(uuid)} className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition flex justify-center items-center gap-2">
                                    <Fingerprint className="w-3 h-3" /> UUID
                                </button>
                            )}
                        </div>
                    </div>

                    {/* WSKAŹNIK ZAUFANIA */}
                    <div className={`w-full py-4 rounded-xl border flex flex-col items-center justify-center mb-6 ${scoreColor}`}>
                        <span className="text-4xl font-black tracking-tighter">{trustScore}%</span>
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">{scoreText}</span>
                    </div>

                    {/* PRZYCISKI ZEWNĘTRZNE (Zostawione jako linki) */}
                    <div className="space-y-2">
                        <a href={`https://crafty.gg/@${nick}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 transition">
                            <ExternalLink className="w-3.5 h-3.5 opacity-50" /> Profil Crafty.gg
                        </a>
                        <a href={`https://pl.namemc.com/search?q=${nick}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 transition">
                            <ExternalLink className="w-3.5 h-3.5 opacity-50" /> Profil NameMC
                        </a>
                    </div>
                </div>

                {/* ================= ŚRODEK: DANE OPERACYJNE ================= */}
                <div className="w-full md:w-[35%] bg-[#0a0a0a] border-r border-neutral-800 p-6 flex flex-col overflow-y-auto custom-scrollbar">

                    <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">
                        Akta Operacyjne
                    </h3>

                    {/* SZYBKIE AKCJE ADMINA (ZAKTUALIZOWANE) */}
                    <div className="p-4 rounded-xl border border-neutral-800 bg-[#111] mb-6">
                        <h4 className="text-[9px] font-bold text-neutral-600 uppercase mb-2">Szybkie Akcje Admina</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Kopiuj /BAN */}
                            <button onClick={copyBanCommand} className="flex items-center justify-center gap-2 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/40 text-red-400 rounded text-[10px] font-bold transition">
                                <Terminal className="w-3 h-3" /> Kopiuj /BAN
                            </button>
                            {/* Kopiuj /TEMPBAN */}
                            <button onClick={() => copyTempBanCommand(7)} className="flex items-center justify-center gap-2 py-2 bg-orange-950/20 border border-orange-900/30 hover:bg-orange-900/40 text-orange-400 rounded text-[10px] font-bold transition">
                                <Clock className="w-3 h-3" /> Kopiuj 7D TEMP
                            </button>
                            {/* Kopiuj /MUTE */}
                            <button onClick={copyMuteCommand} className="flex items-center justify-center gap-2 py-2 bg-blue-950/20 border border-blue-900/30 hover:bg-blue-900/40 text-blue-400 rounded text-[10px] font-bold transition">
                                <VolumeX className="w-3 h-3" /> Kopiuj /MUTE
                            </button>
                            {/* Kopiuj /SPRAWDZ */}
                            <button onClick={copyCheckCommand} className="flex items-center justify-center gap-2 py-2 bg-purple-950/20 border border-purple-900/30 hover:bg-purple-900/40 text-purple-400 rounded text-[10px] font-bold transition">
                                <Search className="w-3 h-3" /> Kopiuj /SPRAWDZ
                            </button>
                        </div>
                    </div>


                    {/* ALTY (MULTIKONTA) */}
                    {altAccounts.length > 0 ? (
                        <div className="mb-6 bg-red-950/10 border border-red-900/40 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-red-500 font-bold text-xs mb-2 uppercase tracking-wide">
                                <Users className="w-4 h-4" /> Wykryto **{altAccounts.length}** Multikont
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {altAccounts.map(alt => (
                                    <span key={alt} className="text-[10px] bg-red-900/20 text-red-300 px-2 py-1 rounded border border-red-900/30 font-mono">
                                        {alt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 flex items-center gap-2 text-emerald-500 text-xs font-medium">
                            <CheckCircle className="w-4 h-4" /> Nie wykryto multikont (po DC).
                        </div>
                    )}

                    {/* HISTORIA NICKÓW (TIMELINE) */}
                    <div className="bg-[#111] border border-neutral-800 rounded-xl p-4 mt-auto">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2">
                            <History className="w-3 h-3" /> Ostatni nick
                        </h4>
                        {loadingHistory ? (
                            <div className="text-[10px] text-neutral-600 animate-pulse">Pobieranie...</div>
                        ) : (
                            <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {nameHistory.map((h: any, i) => (
                                    <div key={i} className="relative pl-4 border-l border-neutral-800">
                                        <div className={`absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full ${h.username === nick ? 'bg-emerald-500' : 'bg-neutral-600'}`}></div>
                                        <div className={`text-xs ${h.username === nick ? 'text-white font-bold' : 'text-neutral-400'}`}>{h.username}</div>
                                        {h.changed_at && (
                                            <div className="text-[9px] text-neutral-600 font-mono">
                                                {new Date(h.changed_at).toLocaleDateString('pl-PL')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= PRAWA KOLUMNA: HISTORIA ZGŁOSZEŃ ================= */}
                <div className="w-full md:w-[35%] bg-[#0a0a0a] flex flex-col">

                    {/* HEADER */}
                    <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 flex-shrink-0">
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Swords className="w-4 h-4 text-neutral-500" /> Historia Serwerowa
                            </h3>
                            <div className="text-[10px] text-neutral-500 mt-1">
                                {lastAction && (
                                    <span className={`flex items-center gap-1 ${lastAction.status === 'banned' ? 'text-red-400' : 'text-emerald-500'}`}>
                                        {lastAction.status === 'banned' ? <Ban className="w-2.5 h-2.5"/> : <Check className="w-2.5 h-2.5"/>}
                                        Ostatni Status: {lastAction.status === 'banned' ? 'ZBANOWANY' : 'CZYSTY'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="hidden md:block text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    {/* STATYSTYKI WERYFIKACJI */}
                    <div className="p-4 border-b border-neutral-800 bg-[#0e0e0e] grid grid-cols-3 gap-2 text-center flex-shrink-0">
                        <div className="p-2 border border-neutral-800 rounded-lg bg-[#151515]">
                            <div className="text-sm font-black text-white">{totalReports}</div>
                            <div className="text-[8px] uppercase text-neutral-500 mt-0.5">Zgłoszeń</div>
                        </div>
                        <div className="p-2 border border-neutral-800 rounded-lg bg-emerald-950/10">
                            <div className="text-sm font-black text-emerald-400">{cleanCount}</div>
                            <div className="text-[8px] uppercase text-neutral-500 mt-0.5">Czyste</div>
                        </div>
                        <div className="p-2 border border-neutral-800 rounded-lg bg-red-950/10">
                            <div className="text-sm font-black text-red-400">{bannedCount}</div>
                            <div className="text-[8px] uppercase text-neutral-500 mt-0.5">Banów</div>
                        </div>
                    </div>

                    {/* NOTATKI - Poprawione bezpieczeństwo dostępu do currentUser */}
                    <div className="p-4 border-b border-neutral-800 bg-[#0e0e0e] flex-shrink-0">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2">
                                <StickyNote className="w-3 h-3" /> Notatka
                            </h4>
                            {noteAuthor && (
                                <span
                                    className={`text-[9px] ${
                                        // Zabezpieczenie przed błędem, jeśli currentUser jest undefined
                                        currentUser && noteAuthor === currentUser.displayName
                                            ? 'text-yellow-500 font-bold'
                                            : 'text-neutral-600'
                                    }`}
                                >
                                    Autor: {noteAuthor}
                                </span>
                            )}
                        </div>
                        <textarea
                            className="w-full h-24 bg-[#111] border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 focus:border-yellow-600/50 focus:text-white outline-none resize-none placeholder:text-neutral-700"
                            placeholder="Wpisz ważne informacje o graczu (np. podejrzany o X-ray)..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                        />
                        <button
                            onClick={handleSaveNote}
                            disabled={isSavingNote}
                            className="w-full mt-2 py-2 bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-500 border border-yellow-900/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSavingNote ? "Zapisywanie..." : <><Save className="w-3 h-3" /> Zapisz Notatkę</>}
                        </button>
                    </div>

                    {/* LISTA WPISÓW - Kontener, który się przewija (flex-grow i overflow-y-auto) */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 bg-neutral-950/30">
                        <div className="divide-y divide-neutral-800/50">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-neutral-600 opacity-50 space-y-3">
                                    <User className="w-10 h-10" />
                                    <p className="text-xs">Brak wpisów w bazie.</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-neutral-900/40 transition group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                {item.status === 'banned' ? <ShieldAlert className="w-3.5 h-3.5 text-red-500"/> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500"/>}
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${item.status === 'banned' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {item.status === 'banned' ? 'ZBANOWANY' : 'CZYSTY'}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-neutral-600 font-mono">
                                                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : '-'}
                                            </span>
                                        </div>

                                        <div className="pl-5">
                                            <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-2 mb-1">
                                                {item.description || "Brak opisu."}
                                            </p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-neutral-600">Admin: {item.checkerNick}</span>
                                                {item.evidenceLink && <a href={item.evidenceLink} target="_blank" className="text-[9px] text-blue-500 hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5"/> Dowód</a>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}