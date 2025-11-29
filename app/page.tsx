"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db, User } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, updateDoc, deleteDoc, where, limit, getDocs
} from "firebase/firestore";

// IMPORT KOMPONENTÓW
import Header from "@/components/Header";
import PinWidget from "@/components/PinWidget";
import ReportForm from "@/components/ReportForm";
import ReportCard from "@/components/ReportCard";
import AdminPanel from "@/components/AdminPanel";

export default function Home() {
  const router = useRouter();
  const OWNER_EMAIL = "twoj.email@gmail.com"; // <--- WPISZ TU SWÓJ EMAIL

  // --- STANY ---
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("loading");

  const [reports, setReports] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Stany PIN / API
  const [userPin, setUserPin] = useState(null);
  const [availablePinsCount, setAvailablePinsCount] = useState(0);
  const [newPinInput, setNewPinInput] = useState("");
  const [oceanApiKey, setOceanApiKey] = useState("");
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

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
        router.push("/login"); // Przekierowanie na login
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        setFormData(prev => ({ ...prev, checkerNick: currentUser.displayName || "" }));

        // Sprawdzanie Roli
        if (currentUser.email === OWNER_EMAIL) {
          setUserRole("admin");
          // Aktualizacja danych admina
          await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: "admin",
            lastLogin: serverTimestamp()
          }, { merge: true });

          // Pobranie configu API (tylko dla admina)
          const configSnap = await getDoc(doc(db, "config", "ocean_api"));
          if (configSnap.exists()) {
            setOceanApiKey(configSnap.data().key);
            setIsApiKeySaved(true);
          }
        } else {
          // Zwykły user
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
        // Sprawdź czy ma PIN
        checkUserPin(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- 2. POBIERANIE DANYCH (REPORTS & PINS) ---
  useEffect(() => {
    if (userRole === "member" || userRole === "admin") {
      // Raporty
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const unsubReports = onSnapshot(q, (snapshot) => {
        setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Licznik wolnych pinów (dla admina)
      const qPins = query(collection(db, "pins"), where("usedBy", "==", null));
      const unsubPins = onSnapshot(qPins, (snap) => setAvailablePinsCount(snap.size));

      return () => { unsubReports(); unsubPins(); };
    }
  }, [userRole]);

  // --- 3. DANE ADMINA (USERS LIST) ---
  useEffect(() => {
    if (userRole === "admin" && showAdminPanel) {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      });
    }
  }, [userRole, showAdminPanel]);

  // Reset paginacji przy filtrowaniu
  useEffect(() => setCurrentPage(1), [searchTerm, itemsPerPage, searchType, filterStatus]);


  // --- FUNKCJE ---

  const checkUserPin = async (uid: string) => {
    const q = query(collection(db, "pins"), where("usedBy", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) setUserPin(snap.docs[0].data().code);
  };

  // Funkcja claimPin jest "martwa" w UI v11.2 (bo maintenance), ale zostawiamy logikę
  const claimPin = async () => { console.log("Claim disabled"); };

  const addPinsToDb = async () => {
    if (!newPinInput) return;
    const codes = newPinInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    for (const code of codes) {
      await addDoc(collection(db, "pins"), {
        code,
        addedBy: user?.email,
        createdAt: serverTimestamp(),
        usedBy: null
      });
    }
    setNewPinInput("");
    alert(`Dodano ${codes.length} kodów.`);
  };

  const saveApiKey = async () => {
    try {
      await setDoc(doc(db, "config", "ocean_api"), {
        key: oceanApiKey,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      });
      setIsApiKeySaved(true);
      alert("Zapisano!");
    } catch (e) { alert("Błąd."); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suspectNick || !formData.evidenceLink) return alert("Uzupełnij dane.");

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

  // --- FILTROWANIE I PAGINACJA ---
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

  // --- RENDEROWANIE WIDOKÓW POMOCNICZYCH ---
  if (userRole === "loading" || !user) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Weryfikacja sesji...</div>;
  if (userRole === "pending") return <div className="min-h-screen bg-neutral-950 flex items-center justify-center flex-col gap-4 text-neutral-400"><div>Konto oczekuje na akceptację administratora.</div><button onClick={()=>signOut(auth)} className="underline">Wyloguj</button></div>;

  // --- GŁÓWNY WIDOK PANELU ---
  return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-800">

        {showAdminPanel && userRole === "admin" && (
            <AdminPanel
                onClose={() => setShowAdminPanel(false)}
                usersList={usersList}
                changeUserRole={changeUserRole}
                addPinsToDb={addPinsToDb}
                newPinInput={newPinInput}
                setNewPinInput={setNewPinInput}
                availablePinsCount={availablePinsCount}
                oceanApiKey={oceanApiKey}
                setOceanApiKey={setOceanApiKey}
                saveApiKey={saveApiKey}
                isApiKeySaved={isApiKeySaved}
            />
        )}

        <Header
            user={user}
            userRole={userRole}
            stats={stats}
            onLogout={() => signOut(auth)}
            onOpenAdmin={() => setShowAdminPanel(true)}
        />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* LEWA STRONA */}
          <div className="lg:col-span-1 space-y-6">
            <PinWidget
                userPin={userPin}
                onClaim={claimPin}
                onCopy={(t: string) => { navigator.clipboard.writeText(t); alert("Skopiowano!"); }}
            />
            <ReportForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                editId={editId}
                onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* PRAWA STRONA */}
          <div className="lg:col-span-3">

            {/* FILTRY */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <input type="text" placeholder="Szukaj..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded text-xs focus:border-neutral-600 focus:outline-none text-white" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400 p-2 outline-none">
                <option value="all">Wszystkie</option><option value="pending">Oczekujące</option><option value="banned">Zbanowani</option><option value="clean">Czysty</option>
              </select>
              <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400 p-2 outline-none">
                <option value="suspect">Szukaj Gracza</option><option value="checker">Szukaj Admina</option><option value="id">Szukaj ID</option>
              </select>
            </div>

            {/* LISTA KART */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentReports.map((report) => (
                  <ReportCard
                      key={report.id}
                      report={report}
                      userRole={userRole}
                      userId={user.uid}
                      onEdit={handleEditClick}
                      onChangeStatus={changeReportStatus}
                      onDelete={confirmDeletion}
                      onRequestDelete={requestDeletion}
                  />
              ))}
            </div>

            {/* PAGINACJA */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400 disabled:opacity-50">Poprzednia</button>
                  <span className="px-3 py-1 text-xs text-neutral-500 border border-neutral-800 rounded bg-neutral-900">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400 disabled:opacity-50">Następna</button>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}