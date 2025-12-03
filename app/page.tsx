"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db, User } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, updateDoc, deleteDoc, limit, where, getDocs
} from "firebase/firestore";
import { 
  ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp, 
  DoorOpen, PartyPopper, RefreshCw, Loader2,
  Ghost, Plus, ChevronDown, ChevronUp, PenLine, Search, ShieldAlert, TestTube2
} from "lucide-react";

// IMPORT KOMPONENTÓW
import Header from "@/components/Header";
import WantedWidget from "@/components/WantedWidget";
import ReportForm from "@/components/ReportForm";
import ReportCard from "@/components/ReportCard";
import AdminPanel from "@/components/AdminPanel";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

export default function Home() {
  const router = useRouter();
  const OWNER_EMAIL = "twoj.email@gmail.com"; 

  // --- STANY ---
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("loading");

  const [reports, setReports] = useState<any[]>([]);
  const [externalBans, setExternalBans] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  const [gulagExits, setGulagExits] = useState<any[]>([]);
  const [gulagSearch, setGulagSearch] = useState(""); 
  const [isSyncing, setIsSyncing] = useState(false);

  // UI STATE
  const [isFormOpen, setIsFormOpen] = useState(false); 

  const [wantedCount, setWantedCount] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [historyNick, setHistoryNick] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Filtrowanie Główne
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("suspect");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [formData, setFormData] = useState({
    suspectNick: "", 
    discordId: "", 
    checkerNick: "", 
    evidenceLink: "", 
    description: "",
    status: "pending"
  });

  // 1. AUTORYZACJA
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (currentUser) {
        if (currentUser.email === OWNER_EMAIL) {
          setUserRole("admin");
          await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            role: "admin",
            lastLogin: serverTimestamp()
          }, { merge: true });
        } else {
          const userSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (userSnap.exists()) setUserRole(userSnap.data().role);
          else {
            await setDoc(doc(db, "users", currentUser.uid), {
              email: currentUser.email,
              role: "pending",
              createdAt: serverTimestamp()
            });
            setUserRole("pending");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. POBIERANIE DANYCH (REALTIME)
  useEffect(() => {
    if (userRole === "member" || userRole === "admin") {
      const unsubReports = onSnapshot(query(collection(db, "reports"), orderBy("createdAt", "desc")), (snap) => {
        setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'system' })));
      });
      const unsubWanted = onSnapshot(query(collection(db, "wanted")), (snap) => setWantedCount(snap.size));
      
      // GULAG - POBIERAMY WSZYSTKIE
      const unsubGulag = onSnapshot(query(collection(db, "gulag_releases"), orderBy("releasedAt", "desc")), (snap) => {
         setGulagExits(snap.docs.map(d => d.data()));
      });

      return () => { unsubReports(); unsubWanted(); unsubGulag(); };
    }
  }, [userRole]);

  // 3. SYNCHRONIZACJA API (NAPRAWIONA: CORS PROXY)
  const syncWithApi = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
        console.log("🔄 Pobieranie banów przez CORS Proxy...");
        
        // --- ZMIANA: UŻYCIE CORS PROXY ---
        // Używamy corsproxy.io, aby ominąć blokadę CORS przeglądarki
        const targetUrl = `https://api.rotify.pl/api/v1/castplay/bans?access=tI9P4VQPd3miL9f4&t=${Date.now()}`;
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

        const res = await fetch(proxyUrl);
        
        if (!res.ok) throw new Error(`Błąd Proxy/API: ${res.status}`);
        
        const data = await res.json();
        const apiBansArray = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
        
        console.log(`✅ Pobrano ${apiBansArray.length} banów.`);
        setExternalBans(apiBansArray);

        if (apiBansArray.length === 0) {
            console.warn("API zwróciło 0 banów. Pomijam logikę Gulagu.");
            setIsSyncing(false);
            return;
        }

        // --- DETEKTOR GULAGU ---
        const cacheRef = doc(db, "system", "api_cache");
        const cacheSnap = await getDoc(cacheRef);
        
        const currentApiNicks = apiBansArray.map((b: any) => (b.username || b.name || "").toString().trim());
        const currentApiNicksLower = new Set(currentApiNicks.map((n: string) => n.toLowerCase()));

        if (cacheSnap.exists()) {
            const cachedNicks: string[] = cacheSnap.data().bannedNicks || [];
            
            // Kto zniknął? (Był w cache, nie ma w API)
            const unbannedNicks = cachedNicks.filter(cachedNick => 
                !currentApiNicksLower.has(cachedNick.toLowerCase())
            );

            if (unbannedNicks.length > 0) {
                // Sprawdzamy duplikaty z ostatnich 24h
                const recentQuery = query(
                    collection(db, "gulag_releases"), 
                    where("releasedAt", ">", new Date(Date.now() - 24 * 60 * 60 * 1000))
                );
                const recentSnap = await getDocs(recentQuery);
                const recentNicks = new Set(recentSnap.docs.map(d => d.data().nick.toLowerCase()));

                const batchPromises = unbannedNicks.map(async (nick) => {
                    if (!recentNicks.has(nick.toLowerCase())) {
                        await addDoc(collection(db, "gulag_releases"), {
                            nick: nick,
                            releasedAt: serverTimestamp(),
                            detectedBy: "System"
                        });
                    }
                });
                await Promise.all(batchPromises);
                console.log(`🎉 Zaktualizowano Gulag o ${unbannedNicks.length} wyjść.`);
            }
        }

        // Aktualizuj cache w bazie
        await setDoc(cacheRef, { 
            bannedNicks: currentApiNicks,
            lastUpdated: serverTimestamp()
        }, { merge: true });

    } catch (e) { 
        console.error("Sync Error (Proxy):", e); 
        alert("Błąd pobierania danych. API może być niedostępne.");
    } finally { 
        setIsSyncing(false); 
    }
  };

  useEffect(() => { if (userRole === "member" || userRole === "admin") syncWithApi(); }, [userRole]);

  // 4. MERGE I SORTOWANIE (GŁÓWNA LISTA)
  const allMergedReports = useMemo(() => {
    const formattedApiBans = externalBans.map((ban: any, index: number) => {
      const rawDate = ban.start || ban.created || ban.time || ban.createdAt || Date.now();
      return {
        id: `api-${index}-${ban.username || ban.name}`,
        suspectNick: ban.username || ban.name || "Nieznany",
        checkerNick: ban.admin || ban.staff || "Console",
        status: 'banned',
        evidenceLink: null,
        description: ban.reason || "Import z API",
        source: 'api',
        createdAt: new Date(Number(rawDate) || rawDate), 
        commentsCount: 0
      };
    });

    const dbKeys = new Set(reports.map(r => {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      return `${r.suspectNick?.toLowerCase()}_${dateStr}`;
    }));

    const filteredApiBans = formattedApiBans.filter(apiBan => {
      const d = apiBan.createdAt;
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      const key = `${apiBan.suspectNick?.toLowerCase()}_${dateStr}`;
      return !dbKeys.has(key);
    });

    const combined = [...reports, ...filteredApiBans];

    return combined.sort((a, b) => {
        const getTime = (d: any) => d?.toDate ? d.toDate().getTime() : (d instanceof Date ? d.getTime() : new Date(d).getTime());
        const nickA = (a.suspectNick || "").toLowerCase();
        const nickB = (b.suspectNick || "").toLowerCase();
        const timeA = getTime(a.createdAt);
        const timeB = getTime(b.createdAt);

        switch (sortOrder) {
          case 'date_asc': return timeA - timeB;
          case 'alpha_asc': return nickA.localeCompare(nickB);
          case 'alpha_desc': return nickB.localeCompare(nickA);
          case 'date_desc': default: return timeB - timeA;
        }
    });
  }, [reports, externalBans, sortOrder]);


  // --- FILTROWANIE GULAGU ---
  const filteredGulagExits = gulagExits.filter(g => 
      g.nick.toLowerCase().includes(gulagSearch.toLowerCase())
  );


  // --- CRUD FUNKCJE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suspectNick) return alert("Musisz podać nick gracza.");

    const data = {
      ...formData,
      checkerNick: formData.checkerNick || user?.displayName || "Admin",
      createdAt: serverTimestamp(),
      authorRealName: user?.displayName,
      authorEmail: user?.email,
      authorUid: user?.uid,
      authorPhoto: user?.photoURL,
      status: formData.status || "pending",
      deletionRequested: false
    };

    try {
      if (editId) await updateDoc(doc(db, "reports", editId), data);
      else await addDoc(collection(db, "reports"), data);
      
      setEditId(null); 
      setFormData({suspectNick:"", discordId:"", checkerNick: "", evidenceLink:"", description:"", status: "pending"});
      setIsFormOpen(false); 
    } catch(e){ console.error(e); }
  };

  const handleEditClick = (r: any) => {
    if (r.source === 'api') {
        setEditId(null); 
        setFormData({
            suspectNick: r.suspectNick,
            checkerNick: r.checkerNick || user?.displayName || "System", 
            description: r.description,
            evidenceLink: "",
            discordId: "",
            status: "banned"
        });
    } else {
        setEditId(r.id);
        setFormData({ ...r, status: r.status || "pending" });
    }
    setIsFormOpen(true);
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const handleCancelEdit = () => { 
      setEditId(null); 
      setFormData({ suspectNick: "", discordId: "", checkerNick: "", evidenceLink: "", description: "", status: "pending" });
      setIsFormOpen(false); 
  };

  useEffect(() => {
    if (userRole === "admin" && showAdminPanel) {
      return onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => setUsersList(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
    }
  }, [userRole, showAdminPanel]);
  useEffect(() => setCurrentPage(1), [searchTerm, itemsPerPage, searchType, filterStatus, sortOrder]);
  const changeUserRole = async (uid: string, role: string) => { if(confirm("Zmienić?")) await updateDoc(doc(db, "users", uid), { role }); };
  const updateUserNick = async (uid: string, newNick: string) => { try { await updateDoc(doc(db, "users", uid), { displayName: newNick }); } catch (e) { alert("Błąd"); } };
  const changeReportStatus = async (id: string, status: string) => { await updateDoc(doc(db, "reports", id), { status }); };
  const confirmDeletion = async (id: string, cancel = false) => { if (cancel) await updateDoc(doc(db, "reports", id), { deletionRequested: false }); else if (confirm("Usunąć?")) await deleteDoc(doc(db, "reports", id)); };
  const requestDeletion = async (id: string) => { if (confirm("Zgłosić?")) await updateDoc(doc(db, "reports", id), { deletionRequested: true }); };
  
  const formatReleaseRelative = (ts: any) => { if (!ts) return "-"; try { const date = ts.toDate ? ts.toDate() : new Date(ts); const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000); if(diff < 1) return "Teraz"; if(diff < 60) return `${diff} min`; if(diff < 1440) return `${Math.floor(diff/60)}h`; return `${Math.floor(diff/1440)}d`; } catch(e) { return "-"; } };
  
  const formatReleaseExact = (ts: any) => { if (!ts) return ""; try { const date = ts.toDate ? ts.toDate() : new Date(ts); return date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e) { return ""; } };

  const filteredReports = allMergedReports.filter((report) => {
    let term = searchTerm.toLowerCase().replace("#", "");
    if (filterStatus !== "all" && (report.status || "pending") !== filterStatus) return false;
    if (searchType === "suspect") return (report.suspectNick || "").toLowerCase().includes(term) || (report.discordId || "").toLowerCase().includes(term);
    if (searchType === "checker") return (report.checkerNick || "").toLowerCase().includes(term);
    if (searchType === "id") return report.id.toLowerCase().includes(term);
    return false;
  });

  const currentReports = filteredReports.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const stats = {
    total: allMergedReports.length,
    banned: allMergedReports.filter(r => r.status === 'banned').length,
    clean: allMergedReports.filter(r => r.status === 'clean').length
  };

  if (userRole === "loading" || !user) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Weryfikacja...</div>;
  if (userRole === "pending") return <div className="min-h-screen bg-neutral-950 flex items-center justify-center flex-col gap-4 text-neutral-400"><div>Konto oczekuje na weryfikację.</div><button onClick={()=>signOut(auth)} className="underline">Wyloguj</button></div>;

  return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-800 pb-10">
        {historyNick && <PlayerHistoryModal nick={historyNick} allReports={allMergedReports} currentUser={user} onClose={() => setHistoryNick(null)} />}
        {showAdminPanel && userRole === "admin" && ( <AdminPanel onClose={() => setShowAdminPanel(false)} usersList={usersList} changeUserRole={changeUserRole} updateUserNick={updateUserNick} /> )}

        <Header user={user} userRole={userRole} stats={stats} onLogout={() => signOut(auth)} onOpenAdmin={() => setShowAdminPanel(true)} onSearchPlayer={setHistoryNick} />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ============= LEWA KOLUMNA (WIDGETY) ============= */}
          <div className="lg:col-span-1 space-y-6">
            <WantedWidget count={wantedCount} />

            {/* --- WIDGET WYJŚCIA Z GULAGU --- */}
            <div className="bg-[#0f0f0f] border border-emerald-900/30 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-left duration-500 flex flex-col h-[290px]">

              {/* Header z Odświeżaniem */}
              <div className="p-3 border-b border-emerald-900/20 bg-emerald-950/10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <DoorOpen className="w-3.5 h-3.5" /> Wyjścia z Gulagu
                  </h3>
                  <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/50">
                                {gulagExits.length}
                            </span>
                    <button 
                        onClick={syncWithApi} 
                        disabled={isSyncing}
                        className="text-emerald-500 hover:text-white transition disabled:opacity-50"
                        title="Odśwież listę"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                {/* Wyszukiwarka Gulagu */}
                <div className="relative">
                  <input
                      type="text"
                      placeholder="Szukaj nicku..."
                      value={gulagSearch}
                      onChange={(e) => setGulagSearch(e.target.value)}
                      className="w-full bg-[#050505] border border-neutral-800 rounded-lg py-1.5 pl-8 pr-2 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-900/50 transition placeholder:text-neutral-700"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
                </div>
              </div>

              {/* Lista Unbanów */}
              <div className="p-2 space-y-1.5 overflow-y-auto custom-scrollbar flex-grow">
                {filteredGulagExits.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 text-[10px] italic gap-2 opacity-50">
                      <Ghost className="w-6 h-6"/>
                      {gulagSearch ? "Brak wyników." : "Brak unbanów."}
                    </div>
                ) : (
                    filteredGulagExits.map((g, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#0a0a0a] border border-neutral-800 p-2 rounded-lg group hover:border-emerald-900/50 transition">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-950/20 rounded-md shrink-0">
                              <PartyPopper className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-white leading-tight truncate">{g.nick}</span>
                              <span className="text-[9px] text-neutral-500 leading-tight font-mono opacity-70">
                                            {formatReleaseExact(g.releasedAt)}
                                        </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 whitespace-nowrap ml-2">
                                    {formatReleaseRelative(g.releasedAt)}
                                </span>
                        </div>
                    ))
                )}
              </div>
            </div>

            {/* --- ZWIJANY FORMULARZ ZGŁOSZEŃ --- */}
            <div className="bg-[#0f0f0f] border border-neutral-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300">
                <button
                    onClick={() => { if (editId) handleCancelEdit(); setIsFormOpen(!isFormOpen); }}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                        isFormOpen ? 'bg-neutral-900/50 text-white' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/30'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {editId ? <PenLine className="w-4 h-4 text-yellow-500" /> : <Plus className="w-4 h-4" />}
                        <span className={`text-xs font-bold uppercase tracking-wider ${editId ? 'text-yellow-500' : ''}`}>
                            {editId ? "Uzupełnij Zgłoszenie" : "Dodaj Zgłoszenie"}
                        </span>
                    </div>
                    {isFormOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                </button>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFormOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 pt-0 border-t border-neutral-800/50">
                        <ReportForm 
                            formData={formData} 
                            setFormData={setFormData} 
                            onSubmit={handleSubmit} 
                            editId={editId} 
                            onCancelEdit={handleCancelEdit} 
                        />
                    </div>
                </div>
            </div>

          </div>

          {/* ============= PRAWA KOLUMNA (LISTA + WYSZUKIWARKA) ============= */}
          <div className="lg:col-span-3">
            
            {/* PANEL FILTRÓW */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex-1 relative">
                    <input type="text" placeholder="Szukaj (Nick, Discord, ID)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 pl-3 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs focus:border-neutral-600 outline-none text-white placeholder:text-neutral-600 shadow-sm" />
                 </div>
                 <div className="relative w-full sm:w-48">
                   <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs text-neutral-400 p-2.5 pl-9 outline-none cursor-pointer hover:border-neutral-700 appearance-none shadow-sm">
                     <option value="date_desc">Data: Najnowsze</option><option value="date_asc">Data: Najstarsze</option><option value="alpha_asc">Alfabetycznie: A-Z</option><option value="alpha_desc">Alfabetycznie: Z-A</option>
                   </select>
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500"><CalendarArrowDown className="w-3.5 h-3.5" /></div>
                 </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="flex gap-2 w-full sm:w-auto">
                     <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs text-neutral-400 p-2.5 outline-none cursor-pointer hover:border-neutral-700 flex-1 sm:flex-none shadow-sm"><option value="all">Wszystkie Statusy</option><option value="pending">Oczekujące</option><option value="banned">Zbanowane</option><option value="clean">Czyste</option></select>
                     <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs text-neutral-400 p-2.5 outline-none cursor-pointer hover:border-neutral-700 flex-1 sm:flex-none shadow-sm"><option value="suspect">Szukaj Gracza</option><option value="checker">Szukaj Admina</option><option value="id">Szukaj ID</option></select>
                  </div>

                  {totalPages > 1 && (
                      <div className="flex justify-center sm:justify-end gap-2">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-400 disabled:opacity-30 hover:bg-neutral-800 shadow-sm">Poprzednia</button>
                        <span className="px-4 py-2 text-xs text-neutral-500 border border-neutral-800 rounded-lg bg-neutral-900 font-mono shadow-sm flex items-center">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-400 disabled:opacity-30 hover:bg-neutral-800 shadow-sm">Następna</button>
                      </div>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentReports.map((report) => (
                  <ReportCard
                      key={report.id}
                      report={report}
                      userRole={userRole}
                      userId={user.uid}
                      user={user}
                      onEdit={handleEditClick}
                      onChangeStatus={changeReportStatus}
                      onDelete={confirmDeletion}
                      onRequestDelete={requestDeletion}
                      onOpenHistory={setHistoryNick}
                  />
              ))}
            </div>
          </div>
        </main>
      </div>
  );
}
