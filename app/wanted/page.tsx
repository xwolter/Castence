"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    deleteDoc, doc, serverTimestamp, getDoc
} from "firebase/firestore";
import { Siren, Plus, Trash2, User, AlertOctagon, AlertTriangle, Eye, X } from "lucide-react";
import Header from "@/components/Header";

export default function WantedPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [wantedList, setWantedList] = useState<any[]>([]);
    const [reportsStats, setReportsStats] = useState({ total: 0, banned: 0 });

    // UI
    const [isAdding, setIsAdding] = useState(false);

    // Formularz
    const [newNick, setNewNick] = useState("");
    const [newReason, setNewReason] = useState("");
    const [newPriority, setNewPriority] = useState("medium"); // low, medium, high

    // --- 1. AUTORYZACJA ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/login");
                return;
            }
            setUser(currentUser);

            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
                setUserRole(userSnap.data().role);
            } else {
                setUserRole("pending");
            }
        });
        return () => unsubscribe();
    }, [router]);

    // --- 2. POBIERANIE DANYCH ---
    useEffect(() => {
        if (userRole === "member" || userRole === "admin") {

            // Lista Gończa (Sortowanie: najpierw wg priorytetu? Nie, lepiej wg daty, ale można zmienić)
            // Tutaj sortujemy po dacie dodania (najnowsze na górze)
            const qWanted = query(collection(db, "wanted"), orderBy("createdAt", "desc"));
            const unsubWanted = onSnapshot(qWanted, (snapshot) => {
                setWantedList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            // Statystyki do Headera
            const qStats = query(collection(db, "reports"));
            const unsubStats = onSnapshot(qStats, (snapshot) => {
                const allDocs = snapshot.docs.map(doc => doc.data());
                setReportsStats({
                    total: allDocs.length,
                    banned: allDocs.filter((r: any) => r.status === 'banned').length
                });
            });

            return () => { unsubWanted(); unsubStats(); };
        }
    }, [userRole]);

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
            createdAt: serverTimestamp()
        });

        // Reset
        setNewNick("");
        setNewReason("");
        setNewPriority("medium");
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm("Czy ten gracz został już sprawdzony i można go usunąć z listy?")) {
            await deleteDoc(doc(db, "wanted", id));
        }
    };

    // --- RENDER ---
    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-red-900/30 pb-20">

            <Header
                user={user}
                userRole={userRole}
                stats={reportsStats}
                onLogout={() => signOut(auth)}
                onOpenAdmin={() => {}}
            />

            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* NAGŁÓWEK SEKICJI */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-neutral-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
                            List Gończy
                        </h1>
                        <p className="text-neutral-500 text-sm mt-2 max-w-lg">
                            Lista graczy zgłoszonych do obserwacji lub natychmiastowego sprawdzenia.
                            Jeśli widzisz gracza z tej listy na serwerze – działaj.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 shadow-lg ${isAdding ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'}`}
                    >
                        {isAdding ? <><X className="w-4 h-4"/> Anuluj</> : <><Plus className="w-4 h-4"/> Dodaj Podejrzanego</>}
                    </button>
                </div>

                {/* FORMULARZ DODAWANIA */}
                {isAdding && (
                    <div className="mb-12 bg-[#0f0f0f] border border-neutral-800 p-6 rounded-2xl max-w-2xl mx-auto shadow-2xl animate-in fade-in zoom-in-95">
                        <form onSubmit={handleAdd} className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Nick Gracza</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-900/50 outline-none transition"
                                        value={newNick}
                                        onChange={e => setNewNick(e.target.value)}
                                        placeholder="np. Cheater123"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Priorytet</label>
                                    <select
                                        value={newPriority}
                                        onChange={e => setNewPriority(e.target.value)}
                                        className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 outline-none cursor-pointer"
                                    >
                                        <option value="low">Niski (Do obserwacji)</option>
                                        <option value="medium">Średni (Sprawdzić przy okazji)</option>
                                        <option value="high">KRYTYCZNY (Sprawdzić TERAZ)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5 ml-1">Powód podejrzenia</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white focus:border-red-600 focus:ring-1 focus:ring-red-900/50 outline-none resize-none transition"
                                    value={newReason}
                                    onChange={e => setNewReason(e.target.value)}
                                    placeholder="Opisz dlaczego gracz jest podejrzany (np. dziwne hity, aura, zgłoszenia graczy)..."
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-lg text-xs transition shadow-lg shadow-red-900/20 mt-2">
                                Opublikuj List Gończy
                            </button>
                        </form>
                    </div>
                )}

                {/* LISTA KART WANTED */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wantedList.map((item) => (
                        <WantedCard
                            key={item.id}
                            item={item}
                            user={user}
                            userRole={userRole}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>

                {wantedList.length === 0 && !isAdding && (
                    <div className="text-center py-24 bg-neutral-900/20 rounded-3xl border border-neutral-800/50 border-dashed">
                        <Siren className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <p className="text-neutral-500 text-sm font-medium">Serwer jest czysty.</p>
                        <p className="text-neutral-600 text-xs mt-1">Brak poszukiwanych graczy.</p>
                    </div>
                )}

            </main>
        </div>
    );
}

// --- KOMPONENT KARTY "WANTED POSTER" ---
function WantedCard({ item, user, userRole, onDelete }: any) {

    // Style zależne od priorytetu
    const styles: any = {
        high: {
            border: "border-red-600/60",
            bgBadge: "bg-red-600 text-white",
            icon: <AlertOctagon className="w-3.5 h-3.5"/>,
            label: "KRYTYCZNY",
            glow: "shadow-[0_0_30px_rgba(220,38,38,0.1)] hover:border-red-500"
        },
        medium: {
            border: "border-orange-500/40",
            bgBadge: "bg-orange-500/10 text-orange-500 border-orange-500/20 border",
            icon: <AlertTriangle className="w-3.5 h-3.5"/>,
            label: "Średni",
            glow: "hover:border-orange-500/60"
        },
        low: {
            border: "border-blue-500/30",
            bgBadge: "bg-blue-500/10 text-blue-400 border-blue-500/20 border",
            icon: <Eye className="w-3.5 h-3.5"/>,
            label: "Obserwacja",
            glow: "hover:border-blue-500/50"
        }
    };

    const currentStyle = styles[item.priority] || styles.medium;

    return (
        <div className={`relative bg-[#0f0f0f] rounded-xl border-2 flex flex-col group transition-all duration-300 hover:-translate-y-1 overflow-hidden ${currentStyle.border} ${currentStyle.glow}`}>

            {/* Ostrzegawczy pasek dla High Priority */}
            {item.priority === 'high' && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>
            )}

            <div className="p-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${currentStyle.bgBadge}`}>
                        {currentStyle.icon} {currentStyle.label}
                    </div>

                    <span className="text-[10px] text-neutral-600 font-mono">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('pl-PL') : 'Dzisiaj'}
                    </span>
                </div>

                <div className="text-center my-2 flex-grow flex flex-col justify-center">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase break-words leading-none">
                        {item.nick}
                    </h2>
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.3em] mt-1.5">POSZUKIWANY</p>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 font-medium leading-relaxed text-center mt-4">
                    "{item.reason}"
                </div>
            </div>

            {/* STOPKA */}
            <div className="bg-[#111] border-t border-neutral-800/50 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] text-neutral-600">
                    <div className="bg-neutral-800 p-1 rounded-full"><User className="w-2.5 h-2.5" /></div>
                    <span className="text-neutral-400 font-bold">{item.author}</span>
                </div>

                {/* PRZYCISK USUWANIA */}
                {(userRole === 'admin' || user.uid === item.authorUid) && (
                    <button
                        onClick={() => onDelete(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-emerald-900/20 text-neutral-500 hover:text-emerald-400 border border-neutral-800 hover:border-emerald-900/50 rounded-lg text-[9px] font-bold uppercase transition group/btn"
                    >
                        <Trash2 className="w-3 h-3 group-hover/btn:text-emerald-500" />
                        Złapany / Usuń
                    </button>
                )}
            </div>
        </div>
    );
}