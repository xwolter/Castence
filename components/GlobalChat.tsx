"use client";
import { useState, useEffect, useRef } from "react";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, limit, getDocs, deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    MessageCircle, Minimize2, Send, Plus, Hash, Lock, X, ArrowLeft, Trash2, Smile, BarChart2, Check, Pin, PinOff
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
    const [reactingToMsgId, setReactingToMsgId] = useState<string | null>(null);
    const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null); // Do migania po kliknięciu pinu

    // Kreator Kanału
    const [isCreating, setIsCreating] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Kreator Ankiety
    const [isPollMode, setIsPollMode] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["Tak", "Nie"]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMsgCount = useRef(0);

    // Helpery
    const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(url);

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
        if (isOpen && scrollRef.current && !highlightedMsgId) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

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

    // --- FUNKCJE PRZYPINANIA (NOWE) ---

    const handleTogglePin = async (msg: any) => {
        if (!activeChannelId || userRole !== 'admin') return;
        try {
            await updateDoc(doc(db, "chat_channels", activeChannelId, "messages", msg.id), {
                isPinned: !msg.isPinned
            });
        } catch (e) { alert("Błąd przypinania."); }
    };

    const scrollToMessage = (msgId: string) => {
        const element = document.getElementById(`msg-${msgId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2000); // Wyłącz podświetlenie po 2s
        } else {
            alert("Ta wiadomość jest za stara i nie ma jej w widoku.");
        }
    };

    // --- FUNKCJE WIADOMOŚCI ---

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
                createdAt: serverTimestamp(),
                reactions: {},
                isPinned: false
            });
            setNewMessage("");
            setShowEmoji(false);
        } catch (error) { console.error(error); }
    };

    // --- FUNKCJE ANKIETY ---

    const handleCreatePoll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pollQuestion.trim() || !activeChannelId) return;

        const validOptions = pollOptions.filter(o => o.trim() !== "").map((opt, index) => ({
            id: index, text: opt, votes: []
        }));

        if (validOptions.length < 2) return alert("Min. 2 opcje.");

        try {
            await addDoc(collection(db, "chat_channels", activeChannelId, "messages"), {
                type: 'poll',
                pollStatus: 'open',
                question: pollQuestion,
                options: validOptions,
                author: user.displayName,
                authorUid: user.uid,
                authorPhoto: user.photoURL,
                createdAt: serverTimestamp(),
                reactions: {},
                isPinned: false
            });
            setIsPollMode(false); setPollQuestion(""); setPollOptions(["Tak", "Nie"]);
        } catch (e) { alert("Błąd."); }
    };

    const handleVote = async (msgId: string, optionId: number, currentOptions: any[]) => {
        if (!activeChannelId) return;
        const hasVotedAlready = currentOptions.some((opt: any) => opt.votes?.includes(user.uid));
        if (hasVotedAlready) return;

        const newOptions = currentOptions.map(opt => {
            if (opt.id === optionId) return { ...opt, votes: [...(opt.votes || []), user.uid] };
            return opt;
        });

        await updateDoc(doc(db, "chat_channels", activeChannelId, "messages", msgId), { options: newOptions });
    };

    const handleEndPoll = async (msgId: string) => {
        if (!activeChannelId) return;
        if (confirm("Zakończyć ankietę?")) {
            await updateDoc(doc(db, "chat_channels", activeChannelId, "messages", msgId), { pollStatus: 'closed' });
        }
    };

    // --- FUNKCJE REAKCJI ---

    const onEmojiClick = async (emojiObject: any) => {
        if (reactingToMsgId && activeChannelId) {
            const msg = messages.find(m => m.id === reactingToMsgId);
            if (!msg) return;
            const currentReactions = msg.reactions || {};
            const emoji = emojiObject.emoji;
            let users = currentReactions[emoji] || [];
            const existingIndex = users.findIndex((u: any) => u.uid === user.uid);
            if (existingIndex !== -1) users.splice(existingIndex, 1);
            else users.push({ uid: user.uid, name: user.displayName });
            if (users.length === 0) delete currentReactions[emoji];
            else currentReactions[emoji] = users;
            await updateDoc(doc(db, "chat_channels", activeChannelId, "messages", reactingToMsgId), { reactions: currentReactions });
            setReactingToMsgId(null); setShowEmoji(false);
        } else {
            setNewMessage(prev => prev + emojiObject.emoji);
        }
    };

    // --- POZOSTAŁE ---

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, "chat_channels"), {
                name: newChannelName, isPrivate: isPrivate, allowedUsers: isPrivate ? selectedUsers : [], createdBy: user.displayName, createdByUid: user.uid, createdAt: serverTimestamp(), isSystem: false
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
        if (confirm("Usunąć wiadomość?")) try { await deleteDoc(doc(db, "chat_channels", activeChannelId, "messages", msgId)); } catch (e) { console.error(e); }
    };

    const toggleUserSelection = (uid: string) => {
        if (selectedUsers.includes(uid)) setSelectedUsers(prev => prev.filter(id => id !== uid));
        else setSelectedUsers(prev => [...prev, uid]);
    };

    // --- UI: ZWINIĘTY ---
    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group">
                <MessageCircle className="w-7 h-7" />
                {unreadCount > 0 && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0f0f0f]">{unreadCount > 9 ? '!' : unreadCount}</div>}
            </button>
        );
    }

    const pinnedMessages = messages.filter(m => m.isPinned);

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
                            <div key={ch.id} className={`group flex items-center justify-between w-full px-3 py-3 rounded-lg text-xs font-medium transition cursor-pointer ${activeChannelId === ch.id ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`} onClick={() => { setActiveChannelId(ch.id); setActiveChannelName(ch.name); setIsCreating(false); setIsPollMode(false); }}>
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
                            {isPrivate && <div className="flex-1 overflow-y-auto bg-[#161616] border border-neutral-800 rounded-lg p-2 custom-scrollbar">{allUsers.map(u => (<div key={u.uid} onClick={() => toggleUserSelection(u.uid)} className={`flex justify-between p-2 rounded cursor-pointer mb-1 ${selectedUsers.includes(u.uid) ? 'bg-indigo-900/20 border border-indigo-500/30' : 'hover:bg-neutral-800'}`}><span className="text-xs text-neutral-300">{u.displayName}</span>{selectedUsers.includes(u.uid) && <Check className="w-3 h-3 text-indigo-400"/>}</div>))}</div>}
                            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg mt-auto">Stwórz</button>
                        </form>
                    </div>
                ) : (
                    <>
                        {/* HEADER CZATU */}
                        <div className="border-b border-neutral-800 flex flex-col shrink-0 z-10">
                            <div className="h-14 flex items-center px-4 gap-3 bg-neutral-950/50">
                                <button onClick={() => setActiveChannelId(null)} className="md:hidden text-neutral-400 hover:text-white mr-1"><ArrowLeft className="w-5 h-5" /></button>
                                <Hash className="w-4 h-4 text-neutral-600" />
                                <h3 className="text-sm font-bold text-white truncate flex-1">{activeChannelName || "Wybierz kanał"}</h3>
                                <button onClick={() => setIsOpen(false)} className="md:hidden text-neutral-500"><X className="w-5 h-5"/></button>
                            </div>

                            {/* --- PASEK PRZYPIĘTYCH (NOWE) --- */}
                            {pinnedMessages.length > 0 && (
                                <div
                                    onClick={() => scrollToMessage(pinnedMessages[0].id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 border-t border-neutral-800 cursor-pointer hover:bg-neutral-900 transition"
                                >
                                    <Pin className="w-3 h-3 text-indigo-400 rotate-45" />
                                    <div className="text-[10px] text-neutral-300 truncate flex-1 font-medium">
                                        <span className="font-bold text-neutral-500 mr-1">{pinnedMessages[0].author}:</span>
                                        {pinnedMessages[0].text || (pinnedMessages[0].type === 'poll' ? `Ankieta: ${pinnedMessages[0].question}` : 'Obrazek')}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-0 pb-20 md:pb-4">
                            {messages.map((msg) => {
                                const isMe = user.uid === msg.authorUid;
                                const canDelete = userRole === 'admin' || isMe;
                                const isImg = isImageUrl(msg.text);
                                const isHighlighted = highlightedMsgId === msg.id; // Miganie po kliknięciu pinu

                                return (
                                    <div
                                        key={msg.id}
                                        id={`msg-${msg.id}`} // ID do scrollowania
                                        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group/msg transition-colors duration-500 ${isHighlighted ? 'bg-indigo-500/20 p-2 rounded-xl -mx-2' : ''}`}
                                    >
                                        <img src={msg.authorPhoto} className="w-8 h-8 rounded-lg bg-neutral-800 object-cover self-start mt-1" />

                                        <div className={`max-w-[80%] relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && <div className="text-[10px] text-neutral-500 ml-1 mb-1 font-bold">{msg.author}</div>}

                                            {/* PRZYPIĘTA IKONA */}
                                            {msg.isPinned && (
                                                <div className={`absolute -top-3 ${isMe ? 'right-0' : 'left-0'} text-indigo-400`}>
                                                    <Pin className="w-3 h-3 rotate-45 fill-indigo-400/20" />
                                                </div>
                                            )}

                                            {msg.type === 'poll' ? (
                                                <div className="w-64 bg-neutral-900 border border-neutral-700 rounded-xl p-3">
                                                    <div className="flex justify-between items-start mb-3 border-b border-neutral-800 pb-2">
                                                        <h4 className="text-xs font-bold text-white flex items-center gap-2"><BarChart2 className="w-3 h-3 text-indigo-400" /> {msg.question}</h4>
                                                        {userRole === 'admin' && msg.pollStatus !== 'closed' && (
                                                            <button onClick={() => handleEndPoll(msg.id)} className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold">Zakończ</button>
                                                        )}
                                                        {msg.pollStatus === 'closed' && <span className="text-[9px] text-neutral-500 font-bold uppercase border border-neutral-700 px-1 rounded">Koniec</span>}
                                                    </div>

                                                    {(() => {
                                                        const totalVotes = msg.options.reduce((acc: any, o: any) => acc + (o.votes?.length || 0), 0);
                                                        const myVoteId = msg.options.find((o: any) => o.votes?.includes(user.uid))?.id;
                                                        const hasVoted = myVoteId !== undefined;
                                                        const isClosed = msg.pollStatus === 'closed';

                                                        return (
                                                            <div className="space-y-2">
                                                                {msg.options.map((opt: any) => {
                                                                    const votes = opt.votes?.length || 0;
                                                                    const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                                                    const isMyChoice = opt.id === myVoteId;

                                                                    if (hasVoted || isClosed) {
                                                                        return (
                                                                            <div key={opt.id} className="relative h-8 bg-neutral-800 rounded-md overflow-hidden flex items-center px-3 border border-neutral-700/50">
                                                                                <div style={{width: `${percent}%`}} className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ${isClosed ? 'bg-neutral-600/20' : (isMyChoice ? 'bg-indigo-600/60' : 'bg-neutral-600/30')}`}></div>
                                                                                <span className={`relative text-[10px] font-bold z-10 flex-1 ${isClosed ? 'text-neutral-400' : 'text-white'}`}>{opt.text}</span>
                                                                                <span className="relative text-[10px] font-mono text-neutral-400 z-10">{votes} ({percent}%)</span>
                                                                                {isMyChoice && <Check className="w-3 h-3 text-white relative z-10 ml-2" />}
                                                                            </div>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <button key={opt.id} onClick={() => handleVote(msg.id, opt.id, msg.options)} className="w-full py-2 bg-neutral-800 hover:bg-indigo-600 text-white rounded-md text-xs font-medium transition border border-neutral-700 hover:border-indigo-500">{opt.text}</button>
                                                                        );
                                                                    }
                                                                })}
                                                                <div className="mt-2 text-[9px] text-neutral-500 text-right">Głosów: {totalVotes}</div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className={`relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-neutral-800 text-neutral-300 rounded-tl-none'}`}>
                                                    {isImg ? (
                                                        <a href={msg.text} target="_blank" rel="noreferrer" className="block hover:scale-105 transition"><img src={msg.text} className="max-w-[200px] max-h-[200px] rounded-lg mt-1" /></a>
                                                    ) : msg.text}

                                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
                                                            {Object.entries(msg.reactions).map(([emoji, users]: any) => {
                                                                const userNames = users.map((u: any) => u.name).join(", ");
                                                                const iReacted = users.some((u: any) => u.uid === user.uid);
                                                                return (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => { setReactingToMsgId(msg.id); onEmojiClick({emoji}); }}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 transition ${iReacted ? 'bg-indigo-500/30 text-white border border-indigo-500/50' : 'bg-black/20 text-neutral-300 hover:bg-black/40'}`}
                                                                        title={`Zareagowali: ${userNames}`}
                                                                    >
                                                                        {emoji} {users.length}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`text-[9px] text-neutral-600 mt-1 font-mono ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                {formatDate(msg.createdAt)}
                                            </div>

                                            {/* MENU AKCJI */}
                                            <div className={`absolute top-0 flex gap-1 opacity-0 group-hover/msg:opacity-100 transition ${isMe ? '-left-20' : '-right-20'}`}>
                                                {/* PRZYPINANIE (ADMIN) */}
                                                {userRole === 'admin' && (
                                                    <button
                                                        onClick={() => handleTogglePin(msg)}
                                                        className={`p-1.5 bg-neutral-900 border border-neutral-700 rounded-full shadow-md ${msg.isPinned ? 'text-indigo-400' : 'text-neutral-400 hover:text-white'}`}
                                                        title={msg.isPinned ? "Odepnij" : "Przypnij"}
                                                    >
                                                        {msg.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                    </button>
                                                )}

                                                <button onClick={() => { setReactingToMsgId(msg.id); setShowEmoji(true); }} className="p-1.5 bg-neutral-900 border border-neutral-700 rounded-full text-neutral-400 hover:text-yellow-400 shadow-md"><Smile className="w-3 h-3" /></button>

                                                {canDelete && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-neutral-900 border border-neutral-700 rounded-full text-neutral-400 hover:text-red-500 shadow-md"><Trash2 className="w-3 h-3" /></button>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {activeChannelId && (
                            <div className="p-3 border-t border-neutral-800 bg-neutral-950 shrink-0 relative">
                                {showEmoji && <div className="absolute bottom-16 left-0 z-50"><div className="flex justify-end p-1 bg-[#222] rounded-t-lg"><button onClick={()=>setShowEmoji(false)}><X className="w-4 h-4 text-white"/></button></div><EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} width={300} height={350} /></div>}

                                {isPollMode ? (
                                    <div className="bg-[#161616] border border-neutral-800 rounded-xl p-3 animate-in slide-in-from-bottom-2">
                                        <div className="flex justify-between mb-2"><span className="text-xs font-bold text-indigo-400 uppercase">Nowa Ankieta</span><button onClick={() => setIsPollMode(false)}><X className="w-4 h-4 text-neutral-500 hover:text-white"/></button></div>
                                        <input className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white mb-2" placeholder="Pytanie..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                                        <div className="space-y-1 max-h-24 overflow-y-auto mb-2">
                                            {pollOptions.map((opt, idx) => (
                                                <input key={idx} className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-xs text-white" placeholder={`Opcja ${idx+1}`} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} />
                                            ))}
                                            <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-[9px] text-indigo-400 hover:underline">+ Dodaj opcję</button>
                                        </div>
                                        <button onClick={handleCreatePoll} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 rounded">Wyślij</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                        {userRole === 'admin' && <button type="button" onClick={() => setIsPollMode(true)} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition" title="Ankieta"><BarChart2 className="w-5 h-5" /></button>}
                                        <button type="button" onClick={() => { setReactingToMsgId(null); setShowEmoji(!showEmoji); }} className={`p-2 rounded-lg transition ${showEmoji ? 'text-yellow-400' : 'text-neutral-400 hover:text-white'}`}><Smile className="w-5 h-5" /></button>
                                        <input type="text" placeholder={`Napisz na #${activeChannelName}...`} className="flex-1 bg-[#161616] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500/50 outline-none transition placeholder:text-neutral-600" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}/>
                                        <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 shadow-lg"><Send className="w-4 h-4"/></button>
                                    </form>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}