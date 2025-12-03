"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Server, User, Calendar, ShieldAlert, Clock, Search, Ban } from "lucide-react";
import Header from "@/components/Header";

export default function ServerBansPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [bans, setBans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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

    // 2. POBIERANIE DANYCH Z NASZEGO API
    useEffect(() => {
        const fetchBans = async () => {
            try {
                const res = await fetch('/api/bans');
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Sortowanie od najnowszego (zakładamy, że wyższe ID = nowszy, lub po dacie start)
                    setBans(data.sort((a: any, b: any) => b.start - a.start));
                }
            } catch (e) {
                console.error("Błąd pobierania banów:", e);
            } finally {
                setLoading(false);
            }
        };

        if (userRole !== "loading" && userRole !== "pending") {
            fetchBans();
        }
    }, [userRole]);

    // Formater Daty
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Filtrowanie
    const filteredBans = bans.filter(ban =>
        ban.name.toLowerCase().includes(search.toLowerCase()) ||
        ban.admin.toLowerCase().includes(search.toLowerCase()) ||
        ban.reason.toLowerCase().includes(search.toLowerCase())
    );

    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-red-900/30 pb-20">

            {/* Używamy Headera z pustymi statystykami (bo te są lokalne) lub musisz je przekazać */}
            <Header user={user} userRole={userRole} stats={{total: 0, banned: 0}} onLogout={() => signOut(auth)} onOpenAdmin={() => {}} />

            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* NAGŁÓWEK */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-neutral-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
                            <span className="text-orange-600 animate-pulse"><Server className="w-8 h-8" /></span>
                            Bany Serwerowe
                        </h1>
                        <p className="text-neutral-500 text-sm mt-2">Lista banów pobrana bezpośrednio z silnika gry.</p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Szukaj nicku, admina, powodu..."
                            className="w-full bg-[#111] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-orange-600 outline-none text-white transition"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* TABELA / LISTA */}
                {loading ? (
                    <div className="text-center py-20 text-neutral-600 animate-pulse">Synchronizacja z serwerem gry...</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredBans.map((ban) => (
                            <div key={ban.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between hover:border-neutral-700 transition group">

                                {/* LEWA: GRACZ */}
                                <div className="flex items-center gap-4 w-full md:w-1/3">
                                    <img
                                        src={`https://visage.surgeplay.com/face/64/${ban.name}`}
                                        className="w-12 h-12 rounded-lg border border-neutral-800 bg-neutral-900"
                                        alt="skin"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-white">{ban.name}</h3>
                                            {ban.time === 0 ? (
                                                <span className="text-[9px] font-black bg-red-900/20 text-red-500 px-2 py-0.5 rounded border border-red-900/30 uppercase">PERM</span>
                                            ) : (
                                                <span className="text-[9px] font-black bg-orange-900/20 text-orange-500 px-2 py-0.5 rounded border border-orange-900/30 uppercase">TEMP</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-neutral-500 font-mono mt-1">{ban.uuid}</div>
                                    </div>
                                </div>

                                {/* ŚRODEK: POWÓD */}
                                <div className="w-full md:w-1/3 my-4 md:my-0 text-center md:text-left">
                                    <div className="inline-block bg-[#111] px-4 py-2 rounded-lg border border-neutral-800/50">
                                        <span className="text-xs text-neutral-400 font-medium italic">"{ban.reason}"</span>
                                    </div>
                                </div>

                                {/* PRAWA: ADMIN I DATA */}
                                <div className="flex flex-col items-end w-full md:w-1/3 gap-1">
                                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                                        <ShieldAlert className="w-3.5 h-3.5 text-neutral-600" />
                                        Zbanował: <span className="text-white font-bold">{ban.admin}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-600">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(ban.start)}
                                    </div>
                                    {ban.time > 0 && (
                                        <div className="flex items-center gap-2 text-[10px] text-orange-400/70 mt-1">
                                            <Clock className="w-3 h-3" />
                                            Wygasa: {formatDate(ban.start + ban.time)}
                                        </div>
                                    )}
                                </div>

                            </div>
                        ))}

                        {filteredBans.length === 0 && (
                            <div className="text-center py-20 text-neutral-600">Brak wyników.</div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}