"use client";
import { useState, useEffect, useRef } from "react";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, limit, getDocs, deleteDoc, doc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    MessageCircle, Minimize2, Send, Plus, Hash, Lock, X, ArrowLeft, Trash2, Smile, ExternalLink
} from "lucide-react";
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface GlobalChatProps {
    user: any;
    userRole: string;
}

export default function GlobalChat({ user, userRole }: GlobalChatProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Kanały
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [activeChannelName, setActiveChannelName] = useState("");

    // Wiadomości
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    // UI
    const [showEmoji, setShowEmoji] = useState(false);

    // Kreator
    const [isCreating, setIsCreating] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgCount = useRef(0);

    // --- SPRAWDZANIE CZY TEKST TO LINK DO ZDJĘCIA ---
    const isImageUrl = (url: string) => {
        return /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(url);
    };

    // --- FORMATOWANIE DATY ---
    const formatDate = (timestamp: any) => {
        if (!timestamp?.toDate) return "...";
        const date = timestamp.toDate();
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day}.${month}.${year}r. ${time}`;
    };

    // 1. KANAŁY
    useEffect(() => {
        const q = query(collection(db, "chat_channels"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allChannels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            const myChannels = allChannels.filter((ch: any) =>
                !ch.isPrivate ||
                (ch.allowedUsers && ch.allowedUsers.includes(user.uid)) ||
                ch.createdByUid === user.uid ||
                userRole === 'admin'
            );
            setChannels(myChannels);
            if (!activeChannelId && myChannels.length > 0) {
                setActiveChannelId(myChannels[0].id);
                setActiveChannelName(myChannels[0].name);
            }
        });
        return () => unsubscribe();
    }, [user.uid, userRole]);

    // 2. WIADOMOŚCI
    useEffect(() => {
        if (!activeChannelId) return;
        const q = query(collection(db, "chat_channels", activeChannelId, "messages"), orderBy("createdAt", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            setMessages(msgs);
            if (!isOpen && msgs.length > lastMsgCount.current && lastMsgCount.current !== 0) setUnreadCount(prev => prev + 1);
            lastMsgCount.current = msgs.length;
        });
        return () => unsubscribe();
    }, [activeChannelId, isOpen]);

    useEffect(() => {
        if (isOpen && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setUnreadCount(0);
    }, [messages, isOpen]);

    // Ładowanie userów
    useEffect(() => {
        if (isCreating) {
            const fetchUsers = async () => {
                const q = query(collection(db, "users"));
                const snap = await getDocs(q);
                setAllUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
                setSelectedUsers([user.uid]);
            };
            fetchUsers();
        }
    }, [isCreating]);

    // --- FUNKCJE ---
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeChannelId) return;

        try {
            await addDoc(collection(db, "chat_channels", activeChannelId, "messages"), {
                text: newMessage.trim(),
                type: 'text',
                author: user.displayName || "Anonim",
                authorUid: user.uid,
                authorPhoto: user.photoURL,
                createdAt: serverTimestamp()
            });
            setNewMessage("");
            setShowEmoji(false);
        } catch (error) { console.error(error); }
    };

    const onEmojiClick = (emojiObject: any) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, "chat_channels"), {
                name: newChannelName,
                isPrivate: isPrivate,
                allowedUsers: isPrivate ? selectedUsers : [],
                createdBy: user.displayName,
                createdByUid: user.uid,
                createdAt: serverTimestamp(),
                isSystem: false
            });
            setIsCreating(false); setActiveChannelId(docRef.id); setActiveChannelName(newChannelName); setNewChannelName(""); setIsPrivate(false);
        } catch (e) { alert("Błąd."); }
    };

    const handleDeleteChannel = async (e: React.MouseEvent, channelId: string) => {
        e.stopPropagation();
        if (confirm("Usunąć kanał?")) await deleteDoc(doc(db, "chat_channels", channelId));
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!activeChannelId) return;
        if (confirm("Usunąć wiadomość?")) {
            try { await deleteDoc(doc(db, "chat_channels", activeChannelId, "messages", msgId)); } catch (e) { console.error(e); }
        }
    };

    const toggleUserSelection = (uid: string) => {
        if (selectedUsers.includes(uid)) setSelectedUsers(prev => prev.filter(id => id !== uid));
        else setSelectedUsers(prev => [...prev, uid]);
    };

    // --- UI: ZWINIĘTY ---
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group"
            >
                <MessageCircle className="w-7 h-7" />
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0f0f0f]">
                        {unreadCount > 9 ? '!' : unreadCount}
                    </div>
                )}
            </button>
        );
    }

    // --- UI: OTWARTY ---
    return (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[100] md:w-[700px] md:h-[550px] bg-[#0f0f0f] md:border border-neutral-800 md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden font-sans animate-in slide-in-from-bottom-4 duration-200">

            {/* SIDEBAR */}
            <div className={`w-full md:w-48 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col ${activeChannelId && !isCreating ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 shrink-0">
                    <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">KANAŁY</span>
                    <button onClick={() => { setIsCreating(true); setActiveChannelId(null); }} className="text-neutral-400 hover:text-white transition p-1 rounded hover:bg-neutral-800"><Plus className="w-5 h-5" /></button>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-neutral-400 p-1"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {channels.map(ch => {
                        const canDelete = !ch.isSystem && (ch.createdByUid === user.uid || userRole === 'admin');
                        return (
                            <div key={ch.id} className={`group flex items-center justify-between w-full px-3 py-3 rounded-lg text-xs font-medium transition cursor-pointer ${activeChannelId === ch.id ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`} onClick={() => { setActiveChannelId(ch.id); setActiveChannelName(ch.name); setIsCreating(false); }}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {ch.isPrivate ? <Lock className="w-3 h-3 text-yellow-600 shrink-0" /> : <Hash className="w-3 h-3 text-neutral-600 shrink-0" />}
                                    <span className="truncate text-sm">{ch.name}</span>
                                </div>
                                {canDelete && <button onClick={(e) => handleDeleteChannel(e, ch.id)} className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                            </div>
                        );
                    })}
                </div>
                <div className="hidden md:block p-2 bg-neutral-950 border-t border-neutral-800 shrink-0">
                    <button onClick={() => setIsOpen(false)} className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-white p-2 rounded text-xs hover:bg-neutral-900 transition"><Minimize2 className="w-3 h-3" /> Schowaj</button>
                </div>
            </div>

            {/* GŁÓWNY OBSZAR */}
            <div className={`flex-1 flex flex-col relative bg-[#0f0f0f] ${(!activeChannelId && !isCreating) ? 'hidden md:flex' : 'flex'}`}>

                {isCreating ? (
                    <div className="flex-1 p-6 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-white">Nowy Kanał</h3>
                            <button onClick={() => setIsCreating(false)} className="text-neutral-500"><ArrowLeft className="md:hidden w-5 h-5" /><X className="hidden md:block w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateChannel} className="flex flex-col gap-4 flex-1 overflow-hidden">
                            <input type="text" className="w-full p-3 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white outline-none focus:border-indigo-600" placeholder="Nazwa kanału" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}/>
                            <div className="flex items-center gap-2 p-3 bg-[#161616] border border-neutral-800 rounded-lg">
                                <input type="checkbox" className="accent-indigo-500 w-4 h-4" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> <label className="text-xs text-neutral-300">Prywatny</label>
                            </div>
                            {isPrivate && <div className="flex-1 overflow-y-auto bg-[#161616] border border-neutral-800 rounded-lg p-2 custom-scrollbar">{allUsers.map(u => (<div key={u.uid} onClick={() => toggleUserSelection(u.uid)} className={`flex justify-between p-2 rounded cursor-pointer mb-1 ${selectedUsers.includes(u.uid) ? 'bg-indigo-900/20 border border-indigo-500/30' : 'hover:bg-neutral-800'}`}><span className="text-xs text-neutral-300">{u.displayName}</span>{selectedUsers.includes(u.uid) && <span className="text-indigo-400">✓</span>}</div>))}</div>}
                            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg mt-auto">Stwórz</button>
                        </form>
                    </div>
                ) : (
                    /* CZAT */
                    <>
                        <div className="h-14 border-b border-neutral-800 flex items-center px-4 gap-3 bg-neutral-950/50 shrink-0 z-10">
                            <button onClick={() => setActiveChannelId(null)} className="md:hidden text-neutral-400 hover:text-white mr-1"><ArrowLeft className="w-5 h-5" /></button>
                            <Hash className="w-4 h-4 text-neutral-600" />
                            <h3 className="text-sm font-bold text-white truncate">{activeChannelName || "Wybierz kanał"}</h3>
                            <button onClick={() => setIsOpen(false)} className="md:hidden ml-auto text-neutral-500"><X className="w-5 h-5"/></button>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-0 pb-20 md:pb-4">
                            {messages.map((msg) => {
                                const isMe = user.uid === msg.authorUid;
                                const canDelete = userRole === 'admin' || isMe;

                                // Sprawdzamy czy to zdjęcie (link kończący się na jpg, png itp)
                                const isImg = isImageUrl(msg.text);

                                return (
                                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group/msg`}>
                                        <img src={msg.authorPhoto} className="w-8 h-8 rounded-lg bg-neutral-800 object-cover self-start mt-1" />

                                        <div className={`max-w-[80%] relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>

                                            {!isMe && <div className="text-[10px] text-neutral-500 ml-1 mb-1 font-bold">{msg.author}</div>}

                                            {isImg ? (
                                                // WYŚWIETLANIE OBRAZKA
                                                <a href={msg.text} target="_blank" rel="noreferrer" className="block transition-transform hover:scale-105">
                                                    <img src={msg.text} alt="attachment" className={`max-w-[200px] max-h-[200px] rounded-xl border ${isMe ? 'border-indigo-900' : 'border-neutral-800'}`} />
                                                </a>
                                            ) : (
                                                // ZWYKŁY TEKST
                                                <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-neutral-800 text-neutral-300 rounded-tl-none'}`}>
                                                    {msg.text}
                                                </div>
                                            )}

                                            <div className={`text-[9px] text-neutral-600 mt-1 font-mono ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                {formatDate(msg.createdAt)}
                                            </div>

                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className={`absolute top-4 -translate-y-1/2 p-1.5 bg-neutral-900 border border-neutral-700 rounded-full text-neutral-500 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition shadow-md z-20 cursor-pointer ${isMe ? '-left-8' : '-right-8'}`}
                                                    title="Usuń"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {activeChannelId && (
                            <div className="p-3 border-t border-neutral-800 bg-neutral-950 shrink-0 relative">
                                {showEmoji && <div className="absolute bottom-16 left-0 z-50"><EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} width={300} height={350} /></div>}

                                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                    <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`p-2 rounded-lg transition ${showEmoji ? 'text-yellow-400' : 'text-neutral-400 hover:text-white'}`}><Smile className="w-5 h-5" /></button>
                                    <input type="text" placeholder={`Napisz... (wklej link do zdjęcia, aby wysłać)`} className="flex-1 bg-[#161616] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500/50 outline-none transition placeholder:text-neutral-600" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}/>
                                    <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 shadow-lg"><Send className="w-4 h-4"/></button>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}