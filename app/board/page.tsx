"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
    collection, addDoc, query, orderBy, onSnapshot,
    deleteDoc, doc, serverTimestamp, getDoc, updateDoc, getDocs
} from "firebase/firestore";
import {
    Plus, Trash2, Calendar, User as UserIcon, CheckCircle,
    Clock, AlertOctagon, Search, X, Layout,
    ListTodo, ArrowRight, ArrowLeft, Eye
} from "lucide-react";
import Header from "@/components/Header";

// --- TYPY ---
interface Subtask {
    id: string;
    text: string;
    isDone: boolean;
}

interface Task {
    id: string;
    title: string;
    desc: string;
    status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'; // NOWY STATUS
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigneeUid: string | null;
    assigneeName: string | null;
    assigneePhoto: string | null;
    dueDate: any;
    author: string;
    subtasks: Subtask[];
}

export default function BoardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [tasks, setTasks] = useState<Task[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [reportsStats, setReportsStats] = useState({ total: 0, banned: 0 });

    // Drag & Drop
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Filtry
    const [searchTask, setSearchTask] = useState("");
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [filterCritical, setFilterCritical] = useState(false);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

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

    // 2. DANE
    useEffect(() => {
        if (userRole === "member" || userRole === "admin") {
            const qTasks = query(collection(db, "board_tasks"), orderBy("createdAt", "desc"));
            const unsubTasks = onSnapshot(qTasks, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
            });

            const fetchUsers = async () => {
                const q = query(collection(db, "users"));
                const snap = await getDocs(q);
                setUsersList(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
            };
            fetchUsers();

            const qStats = query(collection(db, "reports"));
            const unsubStats = onSnapshot(qStats, (snapshot) => {
                const allDocs = snapshot.docs.map(doc => doc.data());
                setReportsStats({
                    total: allDocs.length,
                    banned: allDocs.filter((r: any) => r.status === 'banned').length
                });
            });

            return () => { unsubTasks(); unsubStats(); };
        }
    }, [userRole]);

    // --- DRAG & DROP ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        if (!draggedTaskId) return;
        const updatedTasks = tasks.map(t => t.id === draggedTaskId ? { ...t, status: status as any } : t);
        setTasks(updatedTasks);
        await updateDoc(doc(db, "board_tasks", draggedTaskId), { status });
        setDraggedTaskId(null);
    };

    // --- DELETE & MOVE ---
    const handleDelete = async (id: string) => {
        if(confirm("Usunąć zadanie trwale?")) await deleteDoc(doc(db, "board_tasks", id));
    };

    const moveTask = async (id: string, newStatus: string) => {
        await updateDoc(doc(db, "board_tasks", id), { status: newStatus });
    };

    // --- FILTROWANIE ---
    const filteredTasks = tasks.filter(t => {
        if (filterMyTasks && t.assigneeUid !== user.uid) return false;
        if (filterCritical && t.priority !== 'critical') return false;
        if (searchTask && !t.title.toLowerCase().includes(searchTask.toLowerCase())) return false;
        return true;
    });

    // --- STATYSTYKI TABLICY ---
    const boardStats = useMemo(() => {
        return {
            total: tasks.length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
            critical: tasks.filter(t => t.priority === 'critical').length
        };
    }, [tasks]);

    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-blue-900/30 pb-10 flex flex-col">

            {isModalOpen && (
                <TaskModal
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    users={usersList}
                    user={user}
                    initialData={editingTask}
                />
            )}

            <Header user={user} userRole={userRole} stats={reportsStats} onLogout={() => signOut(auth)} onOpenAdmin={() => {}} />

            <main className="flex-1 flex flex-col max-w-[1900px] mx-auto w-full px-6 py-6 overflow-hidden">

                {/* HEADER SEKCJI */}
                <div className="flex flex-col xl:flex-row justify-between items-end gap-6 mb-6 border-b border-neutral-800 pb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <Layout className="w-7 h-7 text-blue-500" /> ZARZĄDZANIE ZADANIAMI
                        </h2>
                        <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                            <span>Wszystkie: <b className="text-white">{boardStats.total}</b></span>
                            <span>Do sprawdzenia: <b className="text-purple-400">{boardStats.review}</b></span>
                            <span>Krytyczne: <b className="text-red-400">{boardStats.critical}</b></span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 xl:flex-none xl:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Szukaj zadania..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:border-blue-500 outline-none text-white"
                                value={searchTask}
                                onChange={(e) => setSearchTask(e.target.value)}
                            />
                        </div>

                        <button onClick={() => setFilterMyTasks(!filterMyTasks)} className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${filterMyTasks ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'}`}>
                            <UserIcon className="w-3.5 h-3.5" /> Moje
                        </button>
                        <button onClick={() => setFilterCritical(!filterCritical)} className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${filterCritical ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'}`}>
                            <AlertOctagon className="w-3.5 h-3.5" /> Krytyczne
                        </button>

                        <div className="w-px h-8 bg-neutral-800 mx-1 hidden md:block"></div>

                        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-900/20 flex items-center gap-2 ml-auto xl:ml-0">
                            <Plus className="w-4 h-4"/> Nowe Zadanie
                        </button>
                    </div>
                </div>

                {/* KANBAN COLUMNS (5 KOLUMN) */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5 h-full overflow-x-auto pb-4">

                    {/* 1. BACKLOG */}
                    <Column
                        id="backlog"
                        title="Pomysły"
                        color="border-neutral-800"
                        bg="bg-neutral-900/20"
                        tasks={filteredTasks.filter(t => t.status === 'backlog')}
                        onDrop={handleDrop} onDragStart={handleDragStart} onDelete={handleDelete}
                        onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                        userRole={userRole}
                        nextStatus="todo"
                    />

                    {/* 2. DO ZROBIENIA */}
                    <Column
                        id="todo"
                        title="Do Zrobienia"
                        color="border-blue-500/20"
                        bg="bg-blue-900/5"
                        tasks={filteredTasks.filter(t => t.status === 'todo')}
                        onDrop={handleDrop} onDragStart={handleDragStart} onDelete={handleDelete}
                        onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                        userRole={userRole}
                        prevStatus="backlog"
                        nextStatus="in_progress"
                    />

                    {/* 3. W TRAKCIE */}
                    <Column
                        id="in_progress"
                        title="W Trakcie"
                        color="border-yellow-500/20"
                        bg="bg-yellow-900/5"
                        tasks={filteredTasks.filter(t => t.status === 'in_progress')}
                        onDrop={handleDrop} onDragStart={handleDragStart} onDelete={handleDelete}
                        onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                        userRole={userRole}
                        prevStatus="todo"
                        nextStatus="review"
                    />

                    {/* 4. DO SPRAWDZENIA (NOWE!) */}
                    <Column
                        id="review"
                        title="Do Sprawdzenia"
                        color="border-purple-500/20"
                        bg="bg-purple-900/5"
                        tasks={filteredTasks.filter(t => t.status === 'review')}
                        onDrop={handleDrop} onDragStart={handleDragStart} onDelete={handleDelete}
                        onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                        userRole={userRole}
                        prevStatus="in_progress"
                        nextStatus="done"
                    />

                    {/* 5. ZAKOŃCZONE */}
                    <Column
                        id="done"
                        title="Zakończone"
                        color="border-emerald-500/20"
                        bg="bg-emerald-900/5"
                        tasks={filteredTasks.filter(t => t.status === 'done')}
                        onDrop={handleDrop} onDragStart={handleDragStart} onDelete={handleDelete}
                        onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                        userRole={userRole}
                        prevStatus="review"
                    />
                </div>
            </main>
        </div>
    );
}

// --- KOMPONENT KOLUMNY (Z SCROLLEM) ---
function Column({ id, title, color, bg, tasks, onDrop, onDragStart, onDelete, onEdit, userRole, prevStatus, nextStatus }: any) {

    const moveTask = async (id: string, status: string) => {
        await updateDoc(doc(db, "board_tasks", id), { status });
    };

    return (
        <div
            className={`flex flex-col rounded-xl border ${color} ${bg} h-full min-h-[400px] max-h-[calc(100vh-200px)] transition-colors`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
        >
            <div className="p-3 border-b border-neutral-800/50 flex justify-between items-center shrink-0">
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest truncate">{title}</h3>
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900/50 px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>

            {/* SCROLLOWALNY OBSZAR ZADAŃ */}
            <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {tasks.map((task: Task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        userRole={userRole}
                        onMovePrev={prevStatus ? () => moveTask(task.id, prevStatus) : null}
                        onMoveNext={nextStatus ? () => moveTask(task.id, nextStatus) : null}
                    />
                ))}
                {tasks.length === 0 && <div className="h-32 flex items-center justify-center text-neutral-700 text-[10px] font-bold uppercase tracking-widest opacity-50 pointer-events-none">Pusto</div>}
            </div>
        </div>
    );
}

// --- KOMPONENT KARTY ZADANIA ---
function TaskCard({ task, onDragStart, onDelete, onEdit, userRole, onMovePrev, onMoveNext }: any) {

    const priorityStyles: any = {
        low: "border-neutral-700 text-neutral-400",
        medium: "border-blue-900 text-blue-400",
        high: "border-orange-900 text-orange-400",
        critical: "border-red-600 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)] animate-pulse"
    };

    const deadline = task.dueDate?.toDate ? task.dueDate.toDate() : null;
    const isOverdue = deadline && new Date() > deadline && task.status !== 'done';

    // Postęp
    const totalSubs = task.subtasks?.length || 0;
    const doneSubs = task.subtasks?.filter((s: Subtask) => s.isDone).length || 0;
    const progress = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={() => onEdit(task)}
            className={`bg-[#141414] p-3.5 rounded-lg border border-neutral-800 hover:border-neutral-600 shadow-sm cursor-grab active:cursor-grabbing group relative transition-all hover:-translate-y-1`}
        >
            {/* Pasek Priorytetu */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${priorityStyles[task.priority]?.split(" ")[0].replace("border", "bg") || "bg-neutral-700"}`}></div>

            <div className="pl-2.5">
                <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityStyles[task.priority] || priorityStyles.low} bg-black/20`}>
                        {task.priority}
                    </span>

                    {/* Przyciski akcji (Delete) */}
                    {userRole === 'admin' && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <h4 className="text-xs font-bold text-white leading-snug mb-1.5 line-clamp-2">{task.title}</h4>

                {/* Pasek postępu (jeśli są podzadania) */}
                {totalSubs > 0 && (
                    <div className="mb-2">
                        <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
                            <span className="flex items-center gap-1"><ListTodo className="w-2.5 h-2.5"/> {doneSubs}/{totalSubs}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div style={{ width: `${progress}%` }} className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800/50">
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5">
                        {task.assigneeName ? (
                            <>
                                <img src={task.assigneePhoto || `https://ui-avatars.com/api/?name=${task.assigneeName}`} className="w-4 h-4 rounded-full border border-neutral-700" />
                                <span className="text-[9px] text-neutral-400 font-medium truncate max-w-[60px]">{task.assigneeName.split(" ")[0]}</span>
                            </>
                        ) : (
                            <span className="text-[9px] text-neutral-600 italic">--</span>
                        )}
                    </div>

                    {/* Strzałki nawigacji (dla tych co nie lubią drag&drop) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        {onMovePrev && (
                            <button onClick={(e) => { e.stopPropagation(); onMovePrev(); }} className="p-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white" title="Cofnij">
                                <ArrowLeft className="w-3 h-3" />
                            </button>
                        )}
                        {onMoveNext && (
                            <button onClick={(e) => { e.stopPropagation(); onMoveNext(); }} className="p-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white" title="Dalej">
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Termin */}
                    {deadline && (
                        <div className={`flex items-center gap-1 text-[9px] font-mono ${isOverdue ? 'text-red-500 font-bold animate-pulse' : 'text-neutral-500'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {deadline.toLocaleDateString('pl-PL', { month: 'numeric', day: 'numeric' })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- KOMPONENT MODALU (DODAWANIE/EDYCJA) ---
function TaskModal({ onClose, users, user, initialData }: any) {
    const [title, setTitle] = useState(initialData?.title || "");
    const [desc, setDesc] = useState(initialData?.desc || "");
    const [priority, setPriority] = useState(initialData?.priority || "medium");
    const [assigneeUid, setAssigneeUid] = useState(initialData?.assigneeUid || "");
    const [date, setDate] = useState(initialData?.dueDate?.toDate ? initialData.dueDate.toDate().toISOString().split('T')[0] : "");

    const [subtasks, setSubtasks] = useState<Subtask[]>(initialData?.subtasks || []);
    const [newSubtask, setNewSubtask] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!title) return;

        const assignee = users.find((u:any) => u.uid === assigneeUid);
        const data = {
            title, desc, priority,
            assigneeUid: assignee ? assignee.uid : null,
            assigneeName: assignee ? assignee.displayName : null,
            assigneePhoto: assignee ? assignee.photoURL : null,
            dueDate: date ? new Date(date) : null,
            author: user.displayName,
            updatedAt: serverTimestamp(),
            subtasks: subtasks
        };

        if (initialData) await updateDoc(doc(db, "board_tasks", initialData.id), data);
        else await addDoc(collection(db, "board_tasks"), { ...data, status: 'backlog', createdAt: serverTimestamp() });
        onClose();
    };

    const addSubtask = (e: React.MouseEvent) => {
        e.preventDefault();
        if(!newSubtask.trim()) return;
        setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask, isDone: false }]);
        setNewSubtask("");
    };

    const toggleSubtask = (id: string) => setSubtasks(subtasks.map(s => s.id === id ? { ...s, isDone: !s.isDone } : s));
    const removeSubtask = (id: string) => setSubtasks(subtasks.filter(s => s.id !== id));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0f0f0f] border border-neutral-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-white">{initialData ? "Edytuj Zadanie" : "Nowe Zadanie"}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-neutral-500 hover:text-white" /></button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2">
                    <input className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none font-bold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tytuł zadania..." />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Priorytet</label>
                            <select className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={priority} onChange={e => setPriority(e.target.value)}>
                                <option value="low">Niski 🟢</option>
                                <option value="medium">Średni 🔵</option>
                                <option value="high">Wysoki 🟠</option>
                                <option value="critical">KRYTYCZNY 🔥</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Termin</label>
                            <input type="date" className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-[#161616] p-4 rounded-xl border border-neutral-800">
                        <label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block flex items-center gap-2"><ListTodo className="w-3 h-3"/> Checklista</label>
                        <div className="space-y-2 mb-3">
                            {subtasks.map(st => (
                                <div key={st.id} className="flex items-center gap-3 group">
                                    <input type="checkbox" checked={st.isDone} onChange={() => toggleSubtask(st.id)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                                    <span className={`text-sm flex-1 ${st.isDone ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>{st.text}</span>
                                    <button type="button" onClick={() => removeSubtask(st.id)} className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X className="w-3.5 h-3.5"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" className="flex-1 bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white outline-none" placeholder="Dodaj krok..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask(e as any)} />
                            <button type="button" onClick={addSubtask} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded text-xs font-bold"><Plus className="w-4 h-4"/></button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Przypisz do</label>
                        <select className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={assigneeUid} onChange={e => setAssigneeUid(e.target.value)}>
                            <option value="">-- Brak --</option>
                            {users.map((u:any) => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Opis</label>
                        <textarea rows={4} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none resize-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Szczegóły..." />
                    </div>

                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm mt-2 transition shadow-lg shadow-blue-900/20 shrink-0">Zapisz</button>
                </form>
            </div>
        </div>
    );
}