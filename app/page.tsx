"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, User } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, updateDoc, deleteDoc, where, getDocs
} from "firebase/firestore";

// IMPORT KOMPONENTÓW
import Header from "@/components/Header";
import WantedWidget from "@/components/WantedWidget";
import ReportForm from "@/components/ReportForm";
import ReportCard, { Report } from "@/components/ReportCard";
import AdminPanel from "@/components/AdminPanel";
import PlayerHistoryModal from "@/components/PlayerHistoryModal";

export default function Home() {
  const router = useRouter();
  const OWNER_EMAIL = "twoj.email@gmail.com"; // <--- WPISZ TU SWÓJ EMAIL

  // --- STANY ---
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("loading");

  const [reports, setReports] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Licznik Wanted
  const [wantedCount, setWantedCount] = useState(0);

  // Modale
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [historyNick, setHistoryNick] = useState<string | null>(null);

  // Edycja
  const [editId, setEditId] = useState<string | null>(null);

  // Filtrowanie
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("suspect");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [formData, setFormData] = useState({
    suspectNick: "", discordId: "", checkerNick: "", evidenceLink: "", description: ""
  });

  // --- 1. LOGIKA AUTORYZACJI I USERA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (currentUser) {
        setFormData(prev => ({ ...prev, checkerNick: currentUser.displayName || "" }));

        if (currentUser.email === OWNER_EMAIL) {
          setUserRole("admin");
          await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: "admin",
            lastLogin: serverTimestamp()
          }, { merge: true });
        } else {
          const userSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role);
          } else {
            await setDoc(doc(db, "users", currentUser.uid), {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
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

  // --- 2. POBIERANIE DANYCH ---
  useEffect(() => {
    if (userRole === "member" || userRole === "admin") {

      // Raporty
      const qReports = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const unsubReports = onSnapshot(qReports, (snapshot) => {
        setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Licznik Wanted
      const qWanted = query(collection(db, "wanted"));
      const unsubWanted = onSnapshot(qWanted, (snap) => setWantedCount(snap.size));

      return () => { unsubReports(); unsubWanted(); };
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === "admin" && showAdminPanel) {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      });
    }
  }, [userRole, showAdminPanel]);

  useEffect(() => setCurrentPage(1), [searchTerm, itemsPerPage, searchType, filterStatus]);

  // --- FUNKCJE ---

  const updateUserNick = async (uid: string, newNick: string) => {
    try {
      await updateDoc(doc(db, "users", uid), { displayName: newNick });
    } catch (e) {
      alert("Błąd zmiany nicku.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suspectNick || !formData.checkerNick) return alert("Musisz podać nick gracza i swój.");

    const data = {
      ...formData,
      createdAt: serverTimestamp(),
      authorRealName: user?.displayName,
      authorEmail: user?.email,
      authorUid: user?.uid,
      authorPhoto: user?.photoURL,
      status: "pending",
      deletionRequested: false
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "reports", editId), data);
      } else {
        await addDoc(collection(db, "reports"), data);
      }
      setEditId(null);
      setFormData({suspectNick:"", discordId:"", checkerNick: user?.displayName || "", evidenceLink:"", description:""});
    } catch(e){ console.error(e); }
  };

  const handleEditClick = (r: any) => {
    setEditId(r.id);
    setFormData(r);
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ suspectNick: "", discordId: "", checkerNick: user?.displayName || "", evidenceLink: "", description: "" });
  };

  const changeUserRole = async (uid: string, role: string) => {
    if(confirm("Zmienić rangę?")) try { await updateDoc(doc(db, "users", uid), { role }); } catch (e) {}
  };

  const changeReportStatus = async (id: string, status: string) => {
    try { await updateDoc(doc(db, "reports", id), { status }); } catch (e) {}
  };

  const confirmDeletion = async (id: string, cancel = false) => {
    if (cancel) {
      try { await updateDoc(doc(db, "reports", id), { deletionRequested: false }); } catch(e){}
      return;
    }
    if (confirm("Usunąć trwale?")) try { await deleteDoc(doc(db, "reports", id)); } catch (e) {}
  };

  const requestDeletion = async (id: string) => {
    if (confirm("Zgłosić do usunięcia?")) try { await updateDoc(doc(db, "reports", id), { deletionRequested: true }); } catch (e) {}
  };

  // --- FILTROWANIE ---
  const filteredReports = reports.filter((report) => {
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
    total: reports.length,
    banned: reports.filter(r => r.status === 'banned').length,
    clean: reports.filter(r => r.status === 'clean').length
  };

  // --- RENDEROWANIE ---
  if (userRole === "loading" || !user) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Weryfikacja sesji...</div>;
  if (userRole === "pending") return <div className="min-h-screen bg-neutral-950 flex items-center justify-center flex-col gap-4 text-neutral-400"><div>Konto oczekuje na akceptację administratora.</div><button onClick={()=>signOut(auth)} className="underline">Wyloguj</button></div>;

  return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-800">

        {/* MODAL KARTOTEKI */}
        {historyNick && (
            <PlayerHistoryModal
                nick={historyNick}
                allReports={reports}
                onClose={() => setHistoryNick(null)}
            />
        )}

        {/* ADMIN PANEL */}
        {showAdminPanel && userRole === "admin" && (
            <AdminPanel
                onClose={() => setShowAdminPanel(false)}
                usersList={usersList}
                changeUserRole={changeUserRole}
                updateUserNick={updateUserNick}
            />
        )}

        <Header
            user={user}
            userRole={userRole}
            stats={stats}
            onLogout={() => signOut(auth)}
            onOpenAdmin={() => setShowAdminPanel(true)}
            onSearchPlayer={setHistoryNick}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* LEWA KOLUMNA */}
          <div className="lg:col-span-1 space-y-6">
            <WantedWidget count={wantedCount} />
            <ReportForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                editId={editId}
                onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* PRAWA KOLUMNA */}
          <div className="lg:col-span-3">

            {/* FILTRY */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* PAGINACJA */}
              {totalPages > 1 && (
                  <div className="flex justify-center gap-2 ">
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-400 disabled:opacity-30 hover:bg-neutral-800 transition">Poprzednia</button>
                    <span className="px-4 py-2 text-xs text-neutral-500 border border-neutral-800 rounded-lg bg-neutral-900 font-mono">{currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-400 disabled:opacity-30 hover:bg-neutral-800 transition">Następna</button>
                  </div>
              )}
              <div className="flex-1">
                <input type="text" placeholder="Szukaj (nick, discord, id)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 bg-[#0f0f0f] border border-neutral-800 rounded-lg text-xs focus:border-neutral-600 outline-none text-white transition placeholder:text-neutral-600" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#0f0f0f] border border-neutral-800 rounded-lg text-xs text-neutral-400 p-2.5 outline-none cursor-pointer hover:border-neutral-700">
                <option value="all">Wszystkie Statusy</option>
                <option value="pending">Oczekujące</option>
                <option value="banned">Zbanowane</option>
                <option value="clean">Czyste</option>
              </select>
              <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="bg-[#0f0f0f] border border-neutral-800 rounded-lg text-xs text-neutral-400 p-2.5 outline-none cursor-pointer hover:border-neutral-700">
                <option value="suspect">Szukaj Gracza</option>
                <option value="checker">Szukaj Admina</option>
                <option value="id">Szukaj ID</option>
              </select>
            </div>

            {/* LISTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentReports.map((report) => (
                  <ReportCard
                      key={report.id}
                      report={report}
                      userRole={userRole}
                      userId={user.uid}
                      user={user} // <--- WAŻNE DLA KOMENTARZY
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