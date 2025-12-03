"use client";
import { useState, useEffect, useRef } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getFirestore, collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, deleteDoc, doc, updateDoc, increment
} from "firebase/firestore";
import { Send, Trash2, MessageSquare } from "lucide-react";

// Inicjalizacja Firebase wewnątrz komponentu, aby uniknąć problemów z importem
const firebaseConfig = JSON.parse((globalThis as any).__firebase_config || '{}');
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

interface CommentsSectionProps {
    reportId: string;
    user: any;
    userRole: string;
    isApiRecord?: boolean;
}

export default function CommentsSection({ reportId, user, userRole, isApiRecord }: CommentsSectionProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!reportId) return;
        // Uwaga: Dla rekordów z API ta ścieżka stworzy "wirtualną" kolekcję, co jest OK.
        const q = query(collection(db, "reports", reportId, "comments"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAtDate: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
            })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [reportId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [comments]);

    // DODAWANIE (Z LICZNIKIEM +1)
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            // 1. Dodaj komentarz (To zadziała nawet dla ID z API)
            await addDoc(collection(db, "reports", reportId, "comments"), {
                text: newComment,
                author: user.displayName || "Anonim",
                authorUid: user.uid,
                authorPhoto: user.photoURL,
                createdAt: serverTimestamp()
            });

            // 2. Zwiększ licznik w głównym raporcie (TYLKO JEŚLI TO NIE JEST REKORD Z API)
            // Rekordy z API nie istnieją w kolekcji 'reports', więc updateDoc by wyrzucił błąd.
            if (!isApiRecord) {
                await updateDoc(doc(db, "reports", reportId), {
                    commentsCount: increment(1)
                });
            }

            setNewComment("");
        } catch (error) {
            console.error(error);
            alert("Błąd wysyłania.");
        }
    };

    // USUWANIE (Z LICZNIKIEM -1)
    const handleDelete = async (commentId: string) => {
        if (confirm("Usunąć?")) {
            try {
                await deleteDoc(doc(db, "reports", reportId, "comments", commentId));

                // Zmniejsz licznik (TYLKO JEŚLI TO NIE JEST REKORD Z API)
                if (!isApiRecord) {
                    await updateDoc(doc(db, "reports", reportId), {
                        commentsCount: increment(-1)
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="bg-[#0c0c0c] border-t border-neutral-800 p-4 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-[10px] uppercase font-bold text-neutral-500 mb-4 flex items-center gap-2 border-b border-neutral-800 pb-2">
                <MessageSquare className="w-3 h-3" /> Dyskusja ({comments.length})
            </h4>
            <div ref={scrollRef} className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {comments.length === 0 && (
                    <div className="text-center text-[10px] text-neutral-600 italic py-4">
                        Brak komentarzy. Bądź pierwszy!
                    </div>
                )}
                {comments.map((c) => {
                    const isMe = user.uid === c.authorUid;
                    return (
                        <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                            <img
                                src={c.authorPhoto || `https://ui-avatars.com/api/?name=${c.author}`}
                                className="w-7 h-7 rounded-full border border-neutral-800 object-cover self-end mb-1"
                                alt="Avatar"
                            />
                            <div className={`max-w-[85%] relative`}>
                                {!isMe && <span className="text-[9px] text-neutral-500 ml-1 block mb-0.5">{c.author}</span>}
                                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words relative group/bubble ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-neutral-800 text-neutral-200 rounded-bl-none'}`}>
                                    {c.text}
                                    {(userRole === 'admin' || isMe) && (
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className={`absolute -top-2 p-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-red-400 opacity-0 group-hover/bubble:opacity-100 transition shadow-sm ${isMe ? '-left-2' : '-right-2'}`}
                                        >
                                            <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                                <span className={`text-[9px] text-neutral-600 mt-1 block ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                    {c.createdAtDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSend} className="relative mt-2 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Napisz komentarz..."
                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-full pl-4 pr-10 py-2.5 text-xs text-white focus:border-indigo-500/50 outline-none transition placeholder:text-neutral-600"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition disabled:opacity-0 disabled:scale-0 transform duration-200 shadow-lg"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}