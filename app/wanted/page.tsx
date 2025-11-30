"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    deleteDoc, doc, serverTimestamp, getDoc, updateDoc, increment
} from "firebase/firestore";
import {
    Siren, Plus, Trash2, User, AlertOctagon, AlertTriangle, Eye, X,
    History, UserCheck, Trophy, CheckCircle, XCircle, UserX, Clock
} from "lucide-react";
import Header from "@/components/Header";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

export default function WantedPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [wantedList, setWantedList] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [hunters, setHunters] = useState<any[]>([]);

    const [historyNick, setHistoryNick] = useState<string | null>(null);
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

            const qHunters = query(collection(db, "users"), orderBy("catches", "desc"));
            const unsubHunters = onSnapshot(qHunters, (snapshot) => {
                setHunters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((u: any) => u.catches > 0));
            });

            return () => { unsubWanted(); unsubReports(); unsubHunters(); };
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
            assignedTo: null,
            assignedToUid: null,
            status: 'open' // open | assigned | pending_review
        });

        setNewNick(""); setNewReason(""); setNewPriority("medium"); setIsAdding(false);
    };

    // 1. ZGŁOSZENIE ZŁAPANIA (Member)
    const handleRequestCatch = async (item: any) => {
        if(confirm("Czy na pewno złapałeś tego gracza? Zgłoszenie trafi do weryfikacji admina.")) {
            await updateDoc(doc(db, "wanted", item.id), {
                status: 'pending_review'
            });
        }
    };

    // 2. ZATWIERDZENIE ZŁAPANIA (Admin)
    const handleConfirmCatch = async (item: any) => {
        if(confirm(`Zatwierdzić złapanie przez ${item.assignedTo}? Punkt zostanie dodany.`)) {
            // Dodaj punkt łowcy
            const hunterRef = doc(db, "users", item.assignedToUid);
            await updateDoc(hunterRef, { catches: increment(1) });

            // Usuń z listy
            await deleteDoc(doc(db, "wanted", item.id));
        }
    };

    // 3. ODRZUCENIE ZŁAPANIA (Admin)
    const handleRejectCatch = async (item: any) => {
        if(confirm("Odrzucić weryfikację? Status wróci do 'w toku'.")) {
            await updateDoc(doc(db, "wanted", item.id), {
                status: 'assigned' // Wracamy do assigned, nie open, żeby member mógł poprawić
            });
        }
    };

    // 4. ZAJMOWANIE / ZWALNIANIE
    const handleAssign = async (item: any) => {
        // Jeśli to ja, mogę zwolnić
        if (item.assignedToUid === user.uid) {
            await updateDoc(doc(db, "wanted", item.id), { assignedTo: null, assignedToUid: null, status: 'open' });
            return;
        }

        // Jeśli to Admin i ktoś inny zajmuje -> WYMUSZENIE ZWOLNIENIA
        if (userRole === 'admin' && item.assignedToUid) {
            if(confirm(`Czy chcesz wyrzucić ${item.assignedTo} z tego zlecenia?`)) {
                await updateDoc(doc(db, "wanted", item.id), { assignedTo: null, assignedToUid: null, status: 'open' });
            }
            return;
        }

        // Zajmowanie
        if (item.assignedToUid) return alert("Ktoś już to sprawdza!");

        await updateDoc(doc(db, "wanted", item.id), {
            assignedTo: user.displayName,
            assignedToUid: user.uid,
            status: 'assigned'
        });
    };

    // Zwykłe usuwanie (anulowanie listu)
    const handleDelete = async (id: string) => {
        if(confirm("Usunąć bez punktowania (np. pomyłka)?")) {
            await deleteDoc(doc(db, "wanted", id));
        }
    };

    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-red-900/30 pb-20">

            {historyNick && <PlayerHistoryModal nick={historyNick} allReports={reports} currentUser={user} onClose={() => setHistoryNick(null)} />}

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {wantedList.map((item) => (
                        <WantedCard
                            key={item.id}
                            item={item}
                            user={user}
                            userRole={userRole}
                            onDelete={handleDelete}
                            onHistory={() => setHistoryNick(item.nick)}
                            onAssign={() => handleAssign(item)}
                            onRequestCatch={() => handleRequestCatch(item)} // Member zgłasza
                            onConfirmCatch={() => handleConfirmCatch(item)} // Admin zatwierdza
                            onRejectCatch={() => handleRejectCatch(item)}   // Admin odrzuca
                        />
                    ))}
                </div>

                {wantedList.length === 0 && !isAdding && <div className="text-center py-20 bg-neutral-900/20 rounded-3xl border border-neutral-800/50 border-dashed mb-16"><Siren className="w-12 h-12 text-neutral-700 mx-auto mb-4" /><p className="text-neutral-500 text-sm">Brak poszukiwanych.</p></div>}

                {/* TABELA ŁOWCÓW */}
                <div className="mt-12">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Top Łowcy</h2>
                        <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">Najwięcej złapanych</span>
                    </div>

                    <div className="bg-[#0f0f0f] border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-900 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            <tr><th className="p-4 w-16 text-center">#</th><th className="p-4">Łowca</th><th className="p-4 text-right">Złapani</th></tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                            {hunters.map((hunter, index) => (
                                <tr key={hunter.id} className="hover:bg-neutral-900/50 transition">
                                    <td className="p-4 text-center font-mono text-neutral-600 text-xs">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                                    <td className="p-4 flex items-center gap-3"><img src={hunter.photoURL || `https://ui-avatars.com/api/?name=${hunter.displayName}`} className="w-8 h-8 rounded-full border border-neutral-700" alt="avatar" /><span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>{hunter.displayName}</span></td>
                                    <td className="p-4 text-right font-black text-emerald-500 text-lg">{hunter.catches}</td>
                                </tr>
                            ))}
                            {hunters.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-neutral-600 text-sm italic">Jeszcze nikt nikogo nie złapał.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- KARTA WANTED ---
function WantedCard({ item, user, userRole, onDelete, onHistory, onAssign, onRequestCatch, onConfirmCatch, onRejectCatch }: any) {

    const styles: any = {
        high: { border: "border-red-600/60", bgBadge: "bg-red-600 text-white", icon: <AlertOctagon className="w-3.5 h-3.5"/>, label: "KRYTYCZNY", glow: "shadow-[0_0_30px_rgba(220,38,38,0.15)] hover:border-red-500" },
        medium: { border: "border-orange-500/40", bgBadge: "bg-orange-500/10 text-orange-500 border-orange-500/20 border", icon: <AlertTriangle className="w-3.5 h-3.5"/>, label: "Średni", glow: "hover:border-orange-500/60" },
        low: { border: "border-blue-500/30", bgBadge: "bg-blue-500/10 text-blue-400 border-blue-500/20 border", icon: <Eye className="w-3.5 h-3.5"/>, label: "Obserwacja", glow: "hover:border-blue-500/50" }
    };
    const currentStyle = styles[item.priority] || styles.medium;

    const isAssigned = !!item.assignedTo;
    const isAssignedToMe = item.assignedToUid === user.uid;
    const isPendingReview = item.status === 'pending_review'; // NOWY STAN

    return (
        <div className={`relative bg-[#0a0a0a] rounded-xl border-2 flex flex-col group transition-all duration-300 hover:-translate-y-1 overflow-hidden ${isPendingReview ? 'border-yellow-500/50 bg-yellow-950/10' : (isAssigned ? 'opacity-90 border-neutral-800' : currentStyle.border)} ${!isAssigned && !isPendingReview && currentStyle.glow}`}>

            {/* NAKŁADKA: WERYFIKACJA ADMINA */}
            {isPendingReview && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
                    <div className="bg-yellow-900/20 border border-yellow-600/50 p-4 rounded-2xl shadow-2xl max-w-xs">
                        <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-2 animate-pulse" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Czeka na Admina</h3>
                        <p className="text-xs text-neutral-400 mb-4">
                            <span className="text-yellow-400 font-bold">{item.assignedTo}</span> zgłasza złapanie gracza.
                        </p>

                        {/* PRZYCISKI DLA ADMINA */}
                        {userRole === 'admin' ? (
                            <div className="flex gap-2 justify-center">
                                <button onClick={onRejectCatch} className="p-2 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 transition" title="Odrzuć"><XCircle className="w-5 h-5"/></button>
                                <button onClick={onConfirmCatch} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg"><CheckCircle className="w-4 h-4"/> Zatwierdź</button>
                            </div>
                        ) : (
                            <span className="text-[10px] text-neutral-600 italic">Tylko admin może zatwierdzić.</span>
                        )}
                    </div>
                </div>
            )}

            {/* NAKŁADKA: ZAJĘTE PRZEZ KOGOŚ (ALE NIE PENDING) */}
            {isAssigned && !isPendingReview && (
                <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-neutral-900 border border-neutral-700 px-5 py-3 rounded-xl flex flex-col items-center shadow-2xl">
                        <span className="text-[9px] text-neutral-500 uppercase font-bold mb-1.5 tracking-wider">Weryfikacja w toku</span>
                        <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            {item.assignedTo}
                        </div>

                        {/* PRZYCISKI DLA POSIADACZA ZLECENIA */}
                        {isAssignedToMe && (
                            <div className="flex gap-2 w-full">
                                <button onClick={onAssign} className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-neutral-400 border border-neutral-700">Zwolnij</button>
                                <button onClick={onRequestCatch} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow-lg">Złapany!</button>
                            </div>
                        )}

                        {/* ADMIN MOŻE WYMUSIĆ ZWOLNIENIE */}
                        {!isAssignedToMe && userRole === 'admin' && (
                            <button onClick={onAssign} className="mt-2 text-[9px] text-red-500 hover:text-red-400 flex items-center gap-1 uppercase font-bold hover:underline"><UserX className="w-3 h-3"/> Wymuś zwolnienie</button>
                        )}
                    </div>
                </div>
            )}

            {/* PASEK PRIORYTETU (Jeśli wolne) */}
            {!isAssigned && !isPendingReview && item.priority === 'high' && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>}

            <div className="p-5 flex-grow flex flex-col relative">
                <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${currentStyle.bgBadge}`}>{currentStyle.icon} {currentStyle.label}</div>
                    <span className="text-[10px] text-neutral-600 font-mono">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : 'Dzisiaj'}</span>
                </div>

                <div className="text-center my-2 flex-grow flex flex-col justify-center">
                    <button onClick={onHistory} className="text-2xl font-black text-white tracking-tighter uppercase break-words leading-none hover:text-blue-400 transition flex items-center justify-center gap-2 group/nick">
                        {item.nick} <History className="w-4 h-4 opacity-0 group-hover/nick:opacity-100 text-neutral-500" />
                    </button>
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.3em] mt-1.5">POSZUKIWANY</p>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 font-medium leading-relaxed text-center mt-4 italic">"{item.reason}"</div>

                {/* PRZYCISK ZAJMIJ (TYLKO GDY WOLNE) */}
                {!isAssigned && (
                    <button onClick={onAssign} className="mt-4 w-full py-2 bg-neutral-900 hover:bg-emerald-900/20 border border-neutral-800 hover:border-emerald-900/50 text-neutral-400 hover:text-emerald-400 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2">
                        <UserCheck className="w-3.5 h-3.5" /> Zajmij się tym
                    </button>
                )}
            </div>

            <div className="bg-[#111] border-t border-neutral-800/50 p-3 flex justify-between items-center relative z-0">
                <div className="flex items-center gap-2 text-[10px] text-neutral-600"><div className="bg-neutral-800 p-1 rounded-full"><User className="w-2.5 h-2.5" /></div><span className="text-neutral-400 font-bold">{item.author}</span></div>

                {/* USUWANIE (BEZ PUNKTÓW) - TYLKO ADMIN LUB AUTOR */}
                {(userRole === 'admin' || user.uid === item.authorUid) && !isPendingReview && (
                    <button onClick={() => onDelete(item.id)} className="flex items-center gap-1.5 px-2 py-1 text-neutral-600 hover:text-red-400 transition" title="Usuń bez punktów (pomyłka)">
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}