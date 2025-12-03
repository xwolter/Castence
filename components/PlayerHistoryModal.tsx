'use client';
import {
    X, History, ShieldAlert, CheckCircle, Clock, Calendar,
    ExternalLink, Copy, User, Fingerprint, Users, StickyNote, Save,
    Terminal, Swords, Ban, Check, VolumeX, Search, Server, DoorOpen
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PlayerHistoryModalProps {
    nick: string;
    allReports: any[];
    currentUser: any;
    onClose: () => void;
}

export default function PlayerHistoryModal({ nick, allReports, currentUser, onClose }: PlayerHistoryModalProps) {
    const [copied, setCopied] = useState(false);
    const [nameHistory, setNameHistory] = useState<any[]>([]);
    const [uuid, setUuid] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [accountType, setAccountType] = useState<'premium' | 'cracked' | 'loading'>('loading');

    const [externalBans, setExternalBans] = useState<any[]>([]);
    const [gulagHistory, setGulagHistory] = useState<any[]>([]);
    const [loadingBans, setLoadingBans] = useState(true);

    const [noteContent, setNoteContent] = useState("");
    const [noteAuthor, setNoteAuthor] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);

    // 1. POBIERANIE DANYCH
    useEffect(() => {
        const fetchData = async () => {
            setLoadingHistory(true);
            setLoadingBans(true);
            try {
                // API ASHCON
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

                // NOTATKA
                const noteRef = doc(db, "player_notes", nick.toLowerCase());
                const noteSnap = await getDoc(noteRef);
                if (noteSnap.exists()) {
                    setNoteContent(noteSnap.data().content || "");
                    setNoteAuthor(noteSnap.data().lastEditedBy || "");
                }

                // API BANS
                try {
                    const bansRes = await fetch('/api/bans');
                    if (bansRes.ok) {
                        const bansData = await bansRes.json();
                        const userBans = bansData.filter((b: any) =>
                            (b.name || b.username || b.nick || "").toLowerCase() === nick.toLowerCase()
                        );
                        setExternalBans(userBans);
                    }
                } catch (err) { console.error("API error", err); }

                // GULAG HISTORY
                try {
                    const gulagSnap = await getDocs(collection(db, "gulag_releases"));
                    const userGulags = gulagSnap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter((g: any) => g.nick.toLowerCase() === nick.toLowerCase());
                    setGulagHistory(userGulags);
                } catch (err) { console.error("Gulag error", err); }

            } catch (e) {
                console.error("Main error:", e);
                setAccountType('cracked');
            } finally {
                setLoadingHistory(false);
                setLoadingBans(false);
            }
        };

        fetchData();
    }, [nick]);

    const handleSaveNote = async () => {
        setIsSavingNote(true);
        try {
            const noteRef = doc(db, "player_notes", nick.toLowerCase());
            const lastEditedBy = currentUser?.displayName || "Admin";
            await setDoc(noteRef, { content: noteContent, lastEditedBy, updatedAt: serverTimestamp() }, { merge: true });
            setNoteAuthor(lastEditedBy);
        } catch (e) { alert("Błąd zapisu."); }
        setIsSavingNote(false);
    };

    // --- ŁĄCZENIE HISTORII ---
    const fullHistory = useMemo(() => {
        const localReports = (allReports || []).filter(r =>
            r.suspectNick?.toLowerCase().trim() === nick.toLowerCase().trim()
        ).map(r => ({
            ...r,
            source: 'system',
            rawDate: r.createdAt?.toDate ? r.createdAt.toDate() : new Date(0)
        }));

        const apiBans = externalBans.map((ban, index) => ({
            id: `ext-${index}`,
            status: 'banned',
            checkerNick: ban.admin || "Console",
            description: ban.reason || "Brak powodu (API)",
            createdAt: { toDate: () => new Date(ban.created || ban.time || Date.now()) },
            rawDate: new Date(ban.created || ban.time || Date.now()),
            source: 'api',
            evidenceLink: null
        }));

        const gulagEvents = gulagHistory.map((g, index) => ({
            id: `gulag-${index}`,
            status: 'unbanned',
            checkerNick: "System (Gulag)",
            description: "Zakupiono wyjście z Gulagu / Unban",
            createdAt: { toDate: () => g.releasedAt?.toDate ? g.releasedAt.toDate() : new Date() },
            rawDate: g.releasedAt?.toDate ? g.releasedAt.toDate() : new Date(),
            source: 'gulag',
            evidenceLink: null
        }));

        return [...localReports, ...apiBans, ...gulagEvents].sort((a, b) =>
            b.rawDate.getTime() - a.rawDate.getTime()
        );
    }, [allReports, externalBans, gulagHistory, nick]);


    const totalReports = fullHistory.length;
    const bannedCount = fullHistory.filter(h => h.status === 'banned').length;
    const cleanCount = fullHistory.filter(h => h.status === 'clean' || h.status === 'unbanned').length;
    const lastAction = fullHistory[0];

    let trustScore = 100;
    if (bannedCount > 0) trustScore = 0;
    if (lastAction?.status === 'unbanned') trustScore = 50;

    let scoreColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    let scoreText = "ZAUFANY";
    if (trustScore === 0) { scoreColor = "text-red-500 border-red-500/20 bg-red-500/10"; scoreText = "KRYTYCZNE"; }
    else if (trustScore === 50) { scoreColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/10"; scoreText = "PO GULAGU"; }

    const knownDiscordId = fullHistory.find(h => h.discordId)?.discordId;
    const altAccounts = knownDiscordId ? Array.from(new Set((allReports || []).filter(r => r.discordId === knownDiscordId && r.suspectNick.toLowerCase() !== nick.toLowerCase()).map(r => r.suspectNick))) : [];

    const copyText = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    const copyBanCommand = () => { copyText(`/ban ${nick} cheaty`); alert(`Skopiowano ban`); };
    const copyTempBanCommand = (days: number) => { copyText(`/tempban ${nick} ${days}d Przyznanie`); alert(`Skopiowano temp`); };
    const copyMuteCommand = () => { copyText(`/mute ${nick} 30m Obraza`); alert(`Skopiowano mute`); };
    const copyCheckCommand = () => { copyText(`/sprawdz ${nick}`); alert(`Skopiowano sprawdz`); };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] w-full max-w-6xl rounded-2xl border border-neutral-800 shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden">

                {/* LEWA KOLUMNA */}
                <div className="w-full md:w-[30%] bg-[#0f0f0f] border-r border-neutral-800 p-6 flex flex-col relative overflow-y-auto custom-scrollbar">
                    <button onClick={onClose} className="absolute right-4 top-4 md:hidden text-neutral-500"><X /></button>
                    <div className="absolute top-4 left-4">
                        {accountType === 'premium' && <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-[9px] font-bold border border-emerald-800 rounded uppercase">Premium</span>}
                        {accountType === 'cracked' && <span className="px-2 py-1 bg-red-900/30 text-red-400 text-[9px] font-bold border border-red-800 rounded uppercase">Non-Premium</span>}
                    </div>
                    <div className="flex flex-col items-center mb-6 mt-6">
                        <div className="relative w-32 h-60 mb-4 transition-transform hover:scale-105 duration-500 cursor-pointer group">
                            <img src={`https://visage.surgeplay.com/full/512/${nick}`} alt={nick} className="w-full h-full object-contain drop-shadow-2xl relative z-10" onError={(e) => { e.currentTarget.src = "https://visage.surgeplay.com/full/512/MHF_Steve" }} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{nick}</h2>
                        <div className="flex gap-2 mt-4 w-full">
                            <button onClick={() => copyText(nick)} className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition flex justify-center items-center gap-2"><Copy className="w-3 h-3" /> NICK</button>
                            {uuid && <button onClick={() => copyText(uuid)} className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-white transition flex justify-center items-center gap-2"><Fingerprint className="w-3 h-3" /> UUID</button>}
                        </div>
                    </div>
                    <div className={`w-full py-4 rounded-xl border flex flex-col items-center justify-center mb-6 ${scoreColor}`}>
                        <span className="text-4xl font-black tracking-tighter">{trustScore}%</span>
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">{scoreText}</span>
                    </div>
                    <div className="space-y-2">
                        <a href={`https://crafty.gg/@${nick}`} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 transition"><ExternalLink className="w-3.5 h-3.5 opacity-50" /> Crafty.gg</a>
                        <a href={`https://pl.namemc.com/search?q=${nick}`} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#252525] border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 transition"><ExternalLink className="w-3.5 h-3.5 opacity-50" /> NameMC</a>
                    </div>
                </div>

                {/* ŚRODEK */}
                <div className="w-full md:w-[35%] bg-[#0a0a0a] border-r border-neutral-800 p-6 flex flex-col overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">Akta Operacyjne</h3>
                    <div className="p-4 rounded-xl border border-neutral-800 bg-[#111] mb-6">
                        <h4 className="text-[9px] font-bold text-neutral-600 uppercase mb-2">Szybkie Akcje</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={copyBanCommand} className="flex items-center justify-center gap-2 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/40 text-red-400 rounded text-[10px] font-bold transition"><Terminal className="w-3 h-3" /> /BAN</button>
                            <button onClick={() => copyTempBanCommand(7)} className="flex items-center justify-center gap-2 py-2 bg-orange-950/20 border border-orange-900/30 hover:bg-orange-900/40 text-orange-400 rounded text-[10px] font-bold transition"><Clock className="w-3 h-3" /> TEMP 7D</button>
                            <button onClick={copyMuteCommand} className="flex items-center justify-center gap-2 py-2 bg-blue-950/20 border border-blue-900/30 hover:bg-blue-900/40 text-blue-400 rounded text-[10px] font-bold transition"><VolumeX className="w-3 h-3" /> /MUTE</button>
                            <button onClick={copyCheckCommand} className="flex items-center justify-center gap-2 py-2 bg-purple-950/20 border border-purple-900/30 hover:bg-purple-900/40 text-purple-400 rounded text-[10px] font-bold transition"><Search className="w-3 h-3" /> /SPRAWDZ</button>
                        </div>
                    </div>
                    {altAccounts.length > 0 ? (
                        <div className="mb-6 bg-red-950/10 border border-red-900/40 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-red-500 font-bold text-xs mb-2 uppercase tracking-wide"><Users className="w-4 h-4" /> Wykryto {altAccounts.length} Multikont</div>
                            <div className="flex flex-wrap gap-2">{altAccounts.map(alt => <span key={alt} className="text-[10px] bg-red-900/20 text-red-300 px-2 py-1 rounded border border-red-900/30 font-mono">{alt}</span>)}</div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 flex items-center gap-2 text-emerald-500 text-xs font-medium"><CheckCircle className="w-4 h-4" /> Brak wykrytych multikont</div>
                    )}
                    <div className="bg-[#111] border border-neutral-800 rounded-xl p-4 mt-auto">
                        <h4 className="text-[10px] font-bold text-neutral-500 uppercase mb-3 flex items-center gap-2"><History className="w-3 h-3" /> Ostatni nick</h4>
                        {loadingHistory ? <div className="text-[10px] text-neutral-600 animate-pulse">Pobieranie...</div> : (
                            <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">{nameHistory.map((h: any, i) => (<div key={i} className="relative pl-4 border-l border-neutral-800"><div className={`absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full ${h.username === nick ? 'bg-emerald-500' : 'bg-neutral-600'}`}></div><div className={`text-xs ${h.username === nick ? 'text-white font-bold' : 'text-neutral-400'}`}>{h.username}</div>{h.changed_at && <div className="text-[9px] text-neutral-600 font-mono">{new Date(h.changed_at).toLocaleDateString('pl-PL')}</div>}</div>))}</div>
                        )}
                    </div>
                </div>

                {/* PRAWA KOLUMNA */}
                <div className="w-full md:w-[35%] bg-[#0a0a0a] flex flex-col">
                    <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 flex-shrink-0">
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Swords className="w-4 h-4 text-neutral-500" /> Historia Kar</h3>
                            <div className="text-[10px] text-neutral-500 mt-1">
                                {lastAction && (
                                    <span className={`flex items-center gap-1 ${lastAction.status === 'banned' ? 'text-red-400' : lastAction.status === 'unbanned' ? 'text-emerald-400' : 'text-emerald-500'}`}>
                                        {lastAction.status === 'banned' ? <Ban className="w-2.5 h-2.5"/> : lastAction.status === 'unbanned' ? <DoorOpen className="w-2.5 h-2.5"/> : <Check className="w-2.5 h-2.5"/>}
                                        Status: {lastAction.status === 'banned' ? 'ZBANOWANY' : lastAction.status === 'unbanned' ? 'WYJŚCIE Z GULAGU' : 'CZYSTY'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="hidden md:block text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 border-b border-neutral-800 bg-[#0e0e0e] grid grid-cols-3 gap-2 text-center flex-shrink-0">
                        <div className="p-2 border border-neutral-800 rounded-lg bg-[#151515]"><div className="text-sm font-black text-white">{totalReports}</div><div className="text-[8px] uppercase text-neutral-500 mt-0.5">Wpisów</div></div>
                        <div className="p-2 border border-neutral-800 rounded-lg bg-emerald-950/10"><div className="text-sm font-black text-emerald-400">{cleanCount}</div><div className="text-[8px] uppercase text-neutral-500 mt-0.5">Czyste</div></div>
                        <div className="p-2 border border-neutral-800 rounded-lg bg-red-950/10"><div className="text-sm font-black text-red-400">{bannedCount}</div><div className="text-[8px] uppercase text-neutral-500 mt-0.5">Bany</div></div>
                    </div>
                    <div className="p-4 border-b border-neutral-800 bg-[#0e0e0e] flex-shrink-0">
                        <div className="flex justify-between items-center mb-2"><h4 className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-2"><StickyNote className="w-3 h-3" /> Notatka</h4>{noteAuthor && <span className={`text-[9px] ${currentUser && noteAuthor === currentUser.displayName ? 'text-yellow-500 font-bold' : 'text-neutral-600'}`}>Autor: {noteAuthor}</span>}</div>
                        <textarea className="w-full h-16 bg-[#111] border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 focus:border-yellow-600/50 outline-none resize-none placeholder:text-neutral-700" placeholder="Wpisz info o graczu..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                        <button onClick={handleSaveNote} disabled={isSavingNote} className="w-full mt-2 py-1.5 bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-500 border border-yellow-900/40 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-2 disabled:opacity-50">{isSavingNote ? "Zapis..." : <><Save className="w-3 h-3" /> Zapisz</>}</button>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 bg-neutral-950/30">
                        <div className="divide-y divide-neutral-800/50">
                            {fullHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-neutral-600 opacity-50 space-y-3"><User className="w-10 h-10" /><p className="text-xs">Brak wpisów.</p></div>
                            ) : (
                                fullHistory.map((item) => (
                                    <div key={item.id} className={`p-4 hover:bg-neutral-900/40 transition group ${item.source === 'api' ? 'bg-red-950/5' : item.source === 'gulag' ? 'bg-emerald-950/10' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                {item.status === 'banned' ? <ShieldAlert className="w-3.5 h-3.5 text-red-500"/> : item.status === 'unbanned' ? <DoorOpen className="w-3.5 h-3.5 text-emerald-500"/> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500"/>}
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${item.status === 'banned' ? 'text-red-400' : item.status === 'unbanned' ? 'text-emerald-400' : 'text-emerald-400'}`}>
                                                    {item.status === 'banned' ? 'ZBANOWANY' : item.status === 'unbanned' ? 'WYJŚCIE Z GULAGU' : 'CZYSTY'}
                                                </span>
                                                {item.source === 'api' && <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700 flex items-center gap-1"><Server className="w-2 h-2"/> API</span>}
                                            </div>
                                            <span className="text-[9px] text-neutral-600 font-mono">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : '-'}</span>
                                        </div>
                                        <div className="pl-5">
                                            <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-2 mb-1">{item.description}</p>
                                            <div className="flex justify-between items-center"><span className="text-[9px] text-neutral-600">Admin: {item.checkerNick}</span>{item.evidenceLink && <a href={item.evidenceLink} target="_blank" className="text-[9px] text-blue-500 hover:underline flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5"/> Dowód</a>}</div>
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