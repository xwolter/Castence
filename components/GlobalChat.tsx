"use client";
import { useState, useEffect, useRef } from "react";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageCircle, X, Send, Minimize2, ChevronUp } from "lucide-react";

interface GlobalChatProps {
    user: any;
}

export default function GlobalChat({ user }: GlobalChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgCount = useRef(0); // Do śledzenia nowych wiadomości

    // 1. POBIERANIE WIADOMOŚCI (Ostatnie 50)
    useEffect(() => {
        const q = query(
            collection(db, "global_chat"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse(); // Odwracamy, żeby najnowsze były na dole
            setMessages(msgs);

            // Logika powiadomień (Czerwona kropka)
            if (!isOpen && msgs.length > lastMsgCount.current && lastMsgCount.current !== 0) {
                setUnreadCount(prev => prev + (msgs.length - lastMsgCount.current));
            }
            lastMsgCount.current = msgs.length;
        });

        return () => unsubscribe();
    }, [isOpen]);

    // Scrollowanie na dół przy nowej wiadomości
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setUnreadCount(0); // Zeruj licznik jak otwarte
        }
    }, [messages, isOpen]);

    // 2. WYSYŁANIE
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDoc(collection(db, "global_chat"), {
                text: newMessage,
                author: user.displayName || "Anonim",
                authorUid: user.uid,
                authorPhoto: user.photoURL,
                createdAt: serverTimestamp()
            });
            setNewMessage("");
        } catch (error) {
            console.error("Błąd czatu:", error);
        }
    };

    // --- RENDER: ZWINIĘTY (PRZYCISK) ---
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group"
            >
                <MessageCircle className="w-7 h-7" />

                {/* Licznik nieprzeczytanych */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0f0f0f]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}

                {/* Tooltip */}
                <span className="absolute right-full mr-3 bg-neutral-900 text-neutral-300 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap border border-neutral-800">
                    Czat Ekipy
                </span>
            </button>
        );
    }

    // --- RENDER: OTWARTY (OKNO) ---
    return (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-[#0f0f0f] border border-neutral-800 rounded-2xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-4 overflow-hidden font-sans">

            {/* HEADER */}
            <div className="p-4 bg-neutral-900/80 border-b border-neutral-800 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h3 className="text-sm font-bold text-white">Czat Globalny</h3>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setIsOpen(false)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition">
                        <Minimize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* LISTA WIADOMOŚCI */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0a0a]"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 opacity-50">
                        <MessageCircle className="w-8 h-8 mb-2" />
                        <p className="text-xs">Tu jest cicho... Napisz coś!</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = user.uid === msg.authorUid;
                    return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <img
                                src={msg.authorPhoto || `https://ui-avatars.com/api/?name=${msg.author}`}
                                className="w-6 h-6 rounded-full border border-neutral-800 self-end mb-1"
                                alt="Av"
                            />
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                {!isMe && <span className="text-[9px] text-neutral-500 ml-1 mb-0.5">{msg.author}</span>}
                                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                                    isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-neutral-800 text-neutral-200 rounded-bl-none border border-neutral-700'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INPUT */}
            <div className="p-3 bg-neutral-900 border-t border-neutral-800">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Napisz wiadomość..."
                        className="w-full bg-[#050505] border border-neutral-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white focus:border-indigo-500/50 outline-none transition placeholder:text-neutral-600"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-0 disabled:scale-0 transform duration-200 shadow-lg"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}