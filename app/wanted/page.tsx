"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    deleteDoc, doc, serverTimestamp, getDoc, updateDoc
} from "firebase/firestore";
import { Siren, Plus, Trash2, User, AlertOctagon, AlertTriangle, Eye, X, History, Shield, UserCheck } from "lucide-react";
import Header from "@/components/Header";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

export default function WantedPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [wantedList, setWantedList] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);

    // Modale
    const [historyNick, setHistoryNick] = useState<string | null>(null);

    // UI
    const [isAdding, setIsAdding] = useState(false);
    const [newNick, setNewNick] = useState("");
    const [newReason, setNewReason] = useState("");
    const [newPriority, setNewPriority] = useState("medium");

    // 1. AUTORYZACJA
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) { router.push("/login"); return; }
            setUser(currentUser);
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) setUserRole(userSnap.data().role);
            else setUserRole("pending");
        });
        return () => unsubscribe();
    }, [router]);

    // 2. DANE
    useEffect(() => {
        if (userRole === "member" || userRole === "admin") {
            const qWanted = query(collection(db, "wanted"), orderBy("createdAt", "desc"));
            const unsubWanted = onSnapshot(qWanted, (snapshot) => {
                setWantedList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            const qReports = query(collection(db, "reports"), orderBy("createdAt", "desc"));
            const unsubReports = onSnapshot(qReports, (snapshot) => {
                setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            return () => { unsubWanted(); unsubReports(); };
        }
    }, [userRole]);

    const stats = { total: reports.length, banned: reports.filter(r => r.status === 'banned').length };

    // --- FUNKCJE ---
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNick || !newReason) return alert("Wpisz nick i powód.");

        await addDoc(collection(db, "wanted"), {
            nick: newNick,
            reason: newReason,
            priority: newPriority,
            author: user.displayName,
            authorUid: user.uid,
            createdAt: serverTimestamp(),
            assignedTo: null,      // NOWE: Kto sprawdza?
            assignedToUid: null    // ID sprawdzającego
        });

        setNewNick(""); setNewReason(""); setNewPriority("medium"); setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm("Usunąć z listy?")) {
            await deleteDoc(doc(db, "wanted", id));
        }
    };

    // NOWE: ZAJMOWANIE ZGŁOSZENIA
    const handleAssign = async (item: any) => {
        if (item.assignedToUid === user.uid) {
            // Zwolnij
            await updateDoc(doc(db, "wanted", item.id), {
                assignedTo: null,
                assignedToUid: null
            });
        } else {
            // Zajmij
            if (item.assignedToUid) return alert("Ktoś już to sprawdza!");

            await updateDoc(doc(db, "wanted", item.id), {
                assignedTo: user.displayName,
                assignedToUid: user.uid
            });
        }
    };

    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-red-900/30 pb-20">

            {historyNick && <PlayerHistoryModal nick={historyNick} allReports={reports} onClose={() => setHistoryNick(null)} />}

            <Header user={user} userRole={userRole} stats={stats} onLogout={() => signOut(auth)} onOpenAdmin={() => {}} />

            <main className="max-w-7xl mx-auto px-6 py-10">

                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-neutral-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
                            <span className="text-red-600 animate-pulse"><Siren className="w-8 h-8" /></span>
                            List Gończy
                        </h1>
                        <p className="text-neutral-500 text-sm mt-2">Gracze do sprawdzenia. Zajmij zgłoszenie, zanim zaczniesz.</p>
                    </div>

                    <button onClick={() => setIsAdding(!isAdding)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 shadow-lg ${isAdding ? 'bg-neutral-800 text-neutral-400' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'}`}>
                        {isAdding ? <><X className="w-4 h-4"/> Anuluj</> : <><Plus className="w-4 h-4"/> Dodaj Podejrzanego</>}
                    </button>
                </div>

                {isAdding && (
                    <div className="mb-12 bg-[#0f0f0f] border border-neutral-800 p-6 rounded-2xl max-w-2xl mx-auto shadow-2xl animate-in fade-in zoom-in-95">
                        <form onSubmit={handleAdd} className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div><label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Nick Gracza</label><input type="text" className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 outline-none" value={newNick} onChange={e => setNewNick(e.target.value)} placeholder="np. Cheater123" /></div>
                                <div><label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Priorytet</label><select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 outline-none"><option value="low">Niski</option><option value="medium">Średni</option><option value="high">KRYTYCZNY</option></select></div>
                            </div>
                            <div><label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Powód</label><textarea rows={3} className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 outline-none resize-none" value={newReason} onChange={e => setNewReason(e.target.value)} /></div>
                            <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-lg text-xs">Opublikuj</button>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wantedList.map((item) => (
                        <WantedCard
                            key={item.id}
                            item={item}
                            user={user}
                            userRole={userRole}
                            onDelete={handleDelete}
                            onHistory={() => setHistoryNick(item.nick)}
                            onAssign={() => handleAssign(item)} // <--- PRZEKAZANIE FUNKCJI
                        />
                    ))}
                </div>

                {wantedList.length === 0 && !isAdding && <div className="text-center py-24 bg-neutral-900/20 rounded-3xl border border-neutral-800/50 border-dashed"><Siren className="w-12 h-12 text-neutral-700 mx-auto mb-4" /><p className="text-neutral-500 text-sm">Brak poszukiwanych.</p></div>}

            </main>
        </div>
    );
}

// --- KARTA ---
function WantedCard({ item, user, userRole, onDelete, onHistory, onAssign }: any) {

    const styles: any = {
        high: { border: "border-red-600/60", bgBadge: "bg-red-600 text-white", icon: <AlertOctagon className="w-3.5 h-3.5"/>, label: "KRYTYCZNY", glow: "shadow-[0_0_30px_rgba(220,38,38,0.15)]" },
        medium: { border: "border-orange-500/40", bgBadge: "bg-orange-500/10 text-orange-500 border-orange-500/20 border", icon: <AlertTriangle className="w-3.5 h-3.5"/>, label: "Średni", glow: "hover:border-orange-500/60" },
        low: { border: "border-blue-500/30", bgBadge: "bg-blue-500/10 text-blue-400 border-blue-500/20 border", icon: <Eye className="w-3.5 h-3.5"/>, label: "Obserwacja", glow: "hover:border-blue-500/50" }
    };
    const currentStyle = styles[item.priority] || styles.medium;

    // Czy ktoś to zajął?
    const isAssigned = !!item.assignedTo;
    const isAssignedToMe = item.assignedToUid === user.uid;

    return (
        <div className={`relative bg-[#0a0a0a] rounded-xl border-2 flex flex-col group transition-all duration-300 hover:-translate-y-1 overflow-hidden ${isAssigned ? 'opacity-80 border-neutral-800 grayscale-[0.5]' : currentStyle.border} ${!isAssigned && currentStyle.glow}`}>

            {/* Pasek zajętości */}
            {isAssigned && (
                <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg flex flex-col items-center shadow-2xl">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold mb-1">Weryfikacja w toku</span>
                        <div className="flex items-center gap-2 text-white font-bold">
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            {item.assignedTo}
                        </div>

                        {/* Jeśli to ja zająłem, mogę zwolnić */}
                        {isAssignedToMe && (
                            <button onClick={onAssign} className="mt-2 text-[10px] text-red-400 hover:underline">Zwolnij zgłoszenie</button>
                        )}
                    </div>
                </div>
            )}

            {/* Pasek priorytetu */}
            {!isAssigned && item.priority === 'high' && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>}

            <div className="p-5 flex-grow flex flex-col relative">
                <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${currentStyle.bgBadge}`}>
                        {currentStyle.icon} {currentStyle.label}
                    </div>
                    <span className="text-[10px] text-neutral-600 font-mono">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : 'Dzisiaj'}</span>
                </div>

                <div className="text-center my-2 flex-grow flex flex-col justify-center">
                    <button onClick={onHistory} className="text-2xl font-black text-white tracking-tighter uppercase break-words leading-none hover:text-blue-400 transition flex items-center justify-center gap-2 group/nick">
                        {item.nick} <History className="w-4 h-4 opacity-0 group-hover/nick:opacity-100 text-neutral-500" />
                    </button>
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.3em] mt-1.5">POSZUKIWANY</p>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 font-medium leading-relaxed text-center mt-4">"{item.reason}"</div>

                {/* PRZYCISK ZAJMIJ */}
                {!isAssigned && (
                    <button onClick={onAssign} className="mt-4 w-full py-2 bg-neutral-900 hover:bg-emerald-900/20 border border-neutral-800 hover:border-emerald-900/50 text-neutral-400 hover:text-emerald-400 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2">
                        <UserCheck className="w-3.5 h-3.5" /> Zajmij się tym
                    </button>
                )}
            </div>

            <div className="bg-[#111] border-t border-neutral-800/50 p-3 flex justify-between items-center relative z-0">
                <div className="flex items-center gap-2 text-[10px] text-neutral-600">
                    <div className="bg-neutral-800 p-1 rounded-full"><User className="w-2.5 h-2.5" /></div>
                    <span className="text-neutral-400 font-bold">{item.author}</span>
                </div>

                {(userRole === 'admin' || user.uid === item.authorUid) && (
                    <button onClick={() => onDelete(item.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-red-900/20 text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900/50 rounded-lg text-[9px] font-bold uppercase transition">
                        <Trash2 className="w-3 h-3" /> USUŃ
                    </button>
                )}
            </div>
        </div>
    );
}