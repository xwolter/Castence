"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import Header from "@/components/Header";
import { Trophy, ShieldAlert, Search, Clock } from "lucide-react";

export default function RankingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");
    const [reports, setReports] = useState<any[]>([]);

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
            const q = query(collection(db, "reports"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setReports(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Konwersja timestampa Firebase na obiekt Date JS
                    createdAtDate: doc.data().createdAt?.toDate()
                })));
            });
            return () => unsubscribe();
        }
    }, [userRole]);

    // --- 3. OBLICZANIE STATYSTYK ---
    const { topChecked, topBanned, topTime } = useMemo(() => {
        // Obiekt pomocniczy do zbierania danych
        const stats: Record<string, {
            nick: string,
            photo: string,
            total: number,
            banned: number,
            timestamps: Date[] // Zbieramy wszystkie daty zgłoszeń dla usera
        }> = {};

        reports.forEach(r => {
            const nick = r.checkerNick || "Nieznany";

            if (!stats[nick]) {
                stats[nick] = {
                    nick,
                    photo: r.authorPhoto,
                    total: 0,
                    banned: 0,
                    timestamps: []
                };
            }

            stats[nick].total += 1;
            if (r.status === 'banned') stats[nick].banned += 1;
            if (r.createdAtDate) stats[nick].timestamps.push(r.createdAtDate);
        });

        // PRZELICZANIE CZASU PRACY (ALGORYTM SESJI)
        const list = Object.values(stats).map(item => {
            // Sortujemy daty od najstarszej
            item.timestamps.sort((a, b) => a.getTime() - b.getTime());

            let totalMs = 0;
            if (item.timestamps.length > 0) {
                let sessionStart = item.timestamps[0];
                let lastInSession = item.timestamps[0];
                const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minut przerwy przerywa sesję
                const BASE_EFFORT = 5 * 60 * 1000; // 5 minut ryczałtu za zgłoszenie

                for (let i = 1; i < item.timestamps.length; i++) {
                    const diff = item.timestamps[i].getTime() - item.timestamps[i - 1].getTime();

                    if (diff < SESSION_TIMEOUT) {
                        // Kontynuacja sesji
                        lastInSession = item.timestamps[i];
                    } else {
                        // Koniec sesji - dodajemy czas trwania + bazowy czas
                        totalMs += (lastInSession.getTime() - sessionStart.getTime()) + BASE_EFFORT;
                        // Nowa sesja
                        sessionStart = item.timestamps[i];
                        lastInSession = item.timestamps[i];
                    }
                }
                // Dodajemy ostatnią sesję
                totalMs += (lastInSession.getTime() - sessionStart.getTime()) + BASE_EFFORT;
            }

            return {
                ...item,
                activeTimeMs: totalMs
            };
        });

        // SORTOWANIE TOP LIST
        const sortedByTotal = [...list].sort((a, b) => b.total - a.total).slice(0, 5);
        const sortedByBanned = [...list].sort((a, b) => b.banned - a.banned).slice(0, 5);
        const sortedByTime = [...list].sort((a, b) => b.activeTimeMs - a.activeTimeMs).slice(0, 5);

        return { topChecked: sortedByTotal, topBanned: sortedByBanned, topTime: sortedByTime };
    }, [reports]);

    // Funkcja formatująca czas (Ms -> Dni Godz Min)
    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const remHours = hours % 24;
        const remMin = minutes % 60;

        if (days > 0) return `${days}d ${remHours}h ${remMin}m`;
        if (hours > 0) return `${hours}h ${remMin}m`;
        return `${minutes}min`;
    };

    // --- RENDER ---
    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie statystyk...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-indigo-500/30 pb-20">

            <Header
                user={user}
                userRole={userRole}
                stats={{ total: reports.length, banned: reports.filter(r => r.status === 'banned').length }}
                onLogout={() => signOut(auth)}
                onOpenAdmin={() => {}}
            />

            <main className="max-w-7xl mx-auto px-6 py-12">

                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">
                        Hala Sław Castence
                    </h1>
                    <p className="text-neutral-500 text-sm">Rankingi aktualizują się w czasie rzeczywistym.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 1. NAJWIĘCEJ SPRAWDZEŃ */}
                    <RankingCard
                        title="Najwięcej Sprawdzeń"
                        subtitle="Ilość wpisów w bazie"
                        icon={<Search className="w-5 h-5 text-blue-400" />}
                        data={topChecked}
                        valueKey="total"
                        formatValue={(v: number) => v} // Zwykła liczba
                        suffix="wpisów"
                        theme="blue"
                    />

                    {/* 2. NAJWIĘCEJ BANÓW */}
                    <RankingCard
                        title="Kat Cheaterów"
                        subtitle="Najwięcej nałożonych banów"
                        icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
                        data={topBanned}
                        valueKey="banned"
                        formatValue={(v: number) => v} // Zwykła liczba
                        suffix="banów"
                        theme="red"
                    />

                    {/* 3. NAJWIĘCEJ CZASU (NOWOŚĆ) */}
                    <RankingCard
                        title="Największa Aktywność"
                        subtitle="Szacowany czas pracy"
                        icon={<Clock className="w-5 h-5 text-violet-400" />}
                        data={topTime}
                        valueKey="activeTimeMs"
                        formatValue={formatTime} // <--- TU UŻYWAMY FORMATERA CZASU
                        suffix=""
                        theme="purple"
                    />

                </div>
            </main>
        </div>
    );
}

// --- KOMPONENT KARTY RANKINGU ---
function RankingCard({ title, subtitle, icon, data, valueKey, suffix, theme, formatValue }: any) {

    const themeStyles: any = {
        blue: { border: "border-blue-500/20", glow: "shadow-blue-500/5", text: "text-blue-400", bg: "bg-blue-500/10" },
        red: { border: "border-rose-500/20", glow: "shadow-rose-500/5", text: "text-rose-400", bg: "bg-rose-500/10" },
        purple: { border: "border-violet-500/20", glow: "shadow-violet-500/5", text: "text-violet-400", bg: "bg-violet-500/10" },
    };

    const currentTheme = themeStyles[theme];

    return (
        <div className={`bg-[#0a0a0a] border border-neutral-900 rounded-3xl overflow-hidden flex flex-col h-full`}>

            {/* HEADER KARTY */}
            <div className="p-6 border-b border-neutral-900 bg-neutral-950/30">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        {icon} {title}
                    </h2>
                </div>
                <p className="text-[11px] text-neutral-500 uppercase font-bold tracking-wider">{subtitle}</p>
            </div>

            {/* LISTA */}
            <div className="p-4 flex flex-col gap-2 flex-grow">
                {data.map((item: any, index: number) => {
                    const isFirst = index === 0;

                    return (
                        <div
                            key={item.nick}
                            className={`
                                relative flex items-center justify-between p-3 rounded-xl border transition-all
                                ${isFirst ? `bg-neutral-900/50 ${currentTheme.border} ${currentTheme.glow} shadow-lg py-5 mb-2` : 'border-transparent hover:bg-neutral-900/50 hover:border-neutral-800'}
                            `}
                        >
                            {/* OZNACZENIE TOP 1 */}
                            {isFirst && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Trophy className={`w-6 h-6 ${currentTheme.text} drop-shadow-md`} />
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold w-6 text-center ${isFirst ? 'text-white text-lg' : 'text-neutral-600 text-sm'}`}>
                                    {index + 1}
                                </span>

                                <div className="flex items-center gap-3">
                                    <img
                                        src={item.photo || `https://ui-avatars.com/api/?name=${item.nick}&background=random`}
                                        className={`rounded-full object-cover ${isFirst ? 'w-10 h-10 ring-2 ring-offset-2 ring-offset-black ' + currentTheme.text.replace('text', 'ring') : 'w-8 h-8 opacity-70'}`}
                                        alt="avatar"
                                    />
                                    <div>
                                        <div className={`font-bold text-sm ${isFirst ? 'text-white' : 'text-neutral-300'}`}>{item.nick}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className={`font-black ${isFirst ? 'text-lg text-white' : 'text-sm text-neutral-400'}`}>
                                    {formatValue(item[valueKey])}
                                </span>
                                {suffix && isFirst && <span className="text-[9px] text-neutral-500 uppercase">{suffix}</span>}
                            </div>
                        </div>
                    );
                })}

                {data.length === 0 && (
                    <div className="text-center py-12 text-neutral-700 text-xs uppercase font-bold tracking-widest">
                        Brak danych
                    </div>
                )}
            </div>
        </div>
    );
}