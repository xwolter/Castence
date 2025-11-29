"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    deleteDoc, doc, serverTimestamp, getDoc
} from "firebase/firestore";
import { Search, Plus, Trash2, Copy, Check, X } from "lucide-react"; // Nowe ikony

// IMPORTUJEMY HEADER
import Header from "@/components/Header";

export default function NotesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    // Dane
    const [notes, setNotes] = useState<any[]>([]);
    const [reportsStats, setReportsStats] = useState({ total: 0, banned: 0 }); // Stan dla statystyk

    // UI
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Formularz
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");

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

    // --- 2. POBIERANIE NOTATEK ---
    useEffect(() => {
        if (userRole === "member" || userRole === "admin") {
            const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [userRole]);

    // --- 3. POBIERANIE STATYSTYK DO HEADERA (Poprawka) ---
    useEffect(() => {
        if (userRole === "member" || userRole === "admin") {
            // Pobieramy raporty tylko po to, by policzyć statystyki dla Headera
            const q = query(collection(db, "reports"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const allDocs = snapshot.docs.map(doc => doc.data());
                setReportsStats({
                    total: allDocs.length,
                    banned: allDocs.filter((r: any) => r.status === 'banned').length
                });
            });
            return () => unsubscribe();
        }
    }, [userRole]);

    // --- FUNKCJE ---
    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newContent) return alert("Wpisz tytuł i treść.");

        await addDoc(collection(db, "notes"), {
            title: newTitle,
            content: newContent,
            createdAt: serverTimestamp(),
            author: user.displayName
        });
        setNewTitle("");
        setNewContent("");
        setIsAdding(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm("Usunąć notatkę?")) {
            await deleteDoc(doc(db, "notes", id));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Filtrowanie notatek
    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER ---
    if (userRole === "loading") return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-emerald-900/30">

            {/* HEADER Z DZIAŁAJĄCYMI STATYSTYKAMI */}
            <Header
                user={user}
                userRole={userRole}
                stats={reportsStats}
                onLogout={() => signOut(auth)}
                onOpenAdmin={() => {}}
            />

            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* PASEK NARZĘDZI */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Buraczki
                        </h2>
                        <p className="text-xs text-neutral-500 mt-1">Baza gotowych odpowiedzi i szablonów.</p>
                    </div>

                    <div className="flex w-full md:w-auto gap-3">
                        {/* Wyszukiwarka */}
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Szukaj notatki..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-sm focus:border-emerald-500/50 outline-none text-white placeholder:text-neutral-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {userRole === "admin" && (
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${isAdding ? 'border-red-900/50 text-red-400 bg-red-900/10' : 'border-neutral-700 text-white bg-neutral-800 hover:bg-neutral-700'}`}
                            >
                                {isAdding ? <><X className="w-4 h-4"/> Anuluj</> : <><Plus className="w-4 h-4"/> Nowa</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* FORMULARZ DODAWANIA */}
                {isAdding && userRole === "admin" && (
                    <div className="mb-10 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-2xl mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-sm font-bold text-white mb-4">Tworzenie nowego szablonu</h3>
                        <form onSubmit={handleAddNote} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Tytuł</label>
                                <input
                                    type="text"
                                    placeholder="np. Wezwanie na sprawdzanie"
                                    className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:border-emerald-600 outline-none"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Treść</label>
                                <textarea
                                    rows={5}
                                    className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-white focus:border-emerald-600 outline-none font-mono"
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-900/20">
                                Zapisz Szablon
                            </button>
                        </form>
                    </div>
                )}

                {/* GRID NOTATEK */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredNotes.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            isAdmin={userRole === "admin"}
                            onDelete={handleDelete}
                            onCopy={copyToClipboard}
                        />
                    ))}
                </div>

                {filteredNotes.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                        <p className="text-neutral-500 text-sm">Nie znaleziono notatek.</p>
                    </div>
                )}

            </main>
        </div>
    );
}

// KOMPONENT KARTY
function NoteCard({ note, isAdmin, onDelete, onCopy }: any) {
    const [copied, setCopied] = useState(false);

    const handleClick = () => {
        onCopy(note.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            onClick={handleClick}
            className={`
                group relative bg-neutral-900 border p-5 rounded-2xl cursor-pointer transition-all duration-200 
                hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50
                ${copied ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-neutral-800 hover:border-emerald-500/30'}
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-white text-sm pr-6 leading-snug">{note.title}</h3>

                {/* Ikona statusu */}
                <div className={`p-1.5 rounded-md transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500 group-hover:text-emerald-400 group-hover:bg-neutral-800'}`}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </div>
            </div>

            <div className="bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/50 text-xs text-neutral-400 font-mono break-words whitespace-pre-wrap line-clamp-6 group-hover:text-neutral-300 transition-colors">
                {note.content}
            </div>

            <div className="mt-4 flex justify-between items-end border-t border-neutral-800 pt-3">
                <span className="text-[10px] text-neutral-600 font-medium">
                    Autor: <span className="text-neutral-500">{note.author}</span>
                </span>

                {isAdmin && (
                    <button
                        onClick={(e) => onDelete(note.id, e)}
                        className="text-neutral-600 hover:text-red-400 p-1.5 hover:bg-red-900/10 rounded transition"
                        title="Usuń notatkę"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}