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
    ListTodo, ArrowRight, ArrowLeft, Eye, GripVertical
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
    status: string; // ID kolumny
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigneeUid: string | null;
    assigneeName: string | null;
    assigneePhoto: string | null;
    dueDate: any;
    author: string;
    subtasks: Subtask[];
}

interface ColumnData {
    id: string;
    title: string;
    order: number;
}

export default function BoardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState("loading");

    const [tasks, setTasks] = useState<Task[]>([]);
    const [columns, setColumns] = useState<ColumnData[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [reportsStats, setReportsStats] = useState({ total: 0, banned: 0 });

    // Drag & Drop
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    // Filtry
    const [searchTask, setSearchTask] = useState("");
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [filterCritical, setFilterCritical] = useState(false);

    // Modal Zadań
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Modal Kolumn
    const [isColModalOpen, setIsColModalOpen] = useState(false);
    const [newColTitle, setNewColTitle] = useState("");

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

            // Zadania
            const qTasks = query(collection(db, "board_tasks"), orderBy("createdAt", "desc"));
            const unsubTasks = onSnapshot(qTasks, (snapshot) => {
                setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
            });

            // Kolumny
            const qCols = query(collection(db, "board_columns"), orderBy("order", "asc"));
            const unsubCols = onSnapshot(qCols, (snapshot) => {
                if (snapshot.empty) {
                    createDefaultColumns();
                } else {
                    setColumns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ColumnData)));
                }
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

            return () => { unsubTasks(); unsubCols(); unsubStats(); };
        }
    }, [userRole]);

    // --- FUNKCJE KOLUMN ---
    const createDefaultColumns = async () => {
        await addDoc(collection(db, "board_columns"), { title: "Do Zrobienia", order: 1 });
        await addDoc(collection(db, "board_columns"), { title: "W Trakcie", order: 2 });
        await addDoc(collection(db, "board_columns"), { title: "Zakończone", order: 3 });
    };

    const handleAddColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newColTitle.trim()) return;
        await addDoc(collection(db, "board_columns"), {
            title: newColTitle,
            order: columns.length + 1
        });
        setNewColTitle("");
        setIsColModalOpen(false);
    };

    const handleDeleteColumn = async (colId: string) => {
        if (confirm("Usunąć kolumnę? Wszystkie zadania w niej zostaną usunięte!")) {
            await deleteDoc(doc(db, "board_columns", colId));
            const tasksToDelete = tasks.filter(t => t.status === colId);
            tasksToDelete.forEach(t => deleteDoc(doc(db, "board_tasks", t.id)));
        }
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = async (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (!draggedTaskId) return;
        const updatedTasks = tasks.map(t => t.id === draggedTaskId ? { ...t, status: colId } : t);
        setTasks(updatedTasks);
        await updateDoc(doc(db, "board_tasks", draggedTaskId), { status: colId });
        setDraggedTaskId(null);
    };

    // --- DELETE & MOVE ---
    const handleDeleteTask = async (id: string) => {
        if(confirm("Usunąć zadanie trwale?")) await deleteDoc(doc(db, "board_tasks", id));
    };

    const moveTask = async (id: string, newColId: string) => {
        await updateDoc(doc(db, "board_tasks", id), { status: newColId });
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
            critical: tasks.filter(t => t.priority === 'critical').length
        };
    }, [tasks]);

    if (userRole === "loading") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Ładowanie...</div>;
    if (userRole === "pending") return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Brak uprawnień.</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-blue-900/30 pb-10 flex flex-col">

            {/* MODAL ZADANIA */}
            {isModalOpen && (
                <TaskModal
                    onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                    users={usersList}
                    user={user}
                    initialData={editingTask}
                    columns={columns}
                />
            )}

            {/* MODAL NOWEJ KOLUMNY */}
            {isColModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#0f0f0f] border border-neutral-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Nowa Kategoria (Kolumna)</h3>
                        <form onSubmit={handleAddColumn} className="flex flex-col gap-4">
                            <input className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" placeholder="Nazwa (np. Do Testów)" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} autoFocus />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsColModalOpen(false)} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg">Anuluj</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">Stwórz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Header user={user} userRole={userRole} stats={reportsStats} onLogout={() => signOut(auth)} onOpenAdmin={() => {}} />

            <main className="flex-1 flex flex-col max-w-[1900px] mx-auto w-full px-6 py-6 overflow-hidden">

                {/* HEADER SEKCJI */}
                <div className="flex flex-col xl:flex-row justify-between items-end gap-6 mb-6 border-b border-neutral-800 pb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <Layout className="w-7 h-7 text-blue-500" /> TABLICA ZADAŃ
                        </h2>
                        <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                            <span>Wszystkie: <b className="text-white">{boardStats.total}</b></span>
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

                        {/* PRZYCISK NOWEJ KOLUMNY (ADMIN + MEMBER) */}
                        {(userRole === 'admin' || userRole === 'member') && (
                            <button onClick={() => setIsColModalOpen(true)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 border border-neutral-700">
                                <Plus className="w-4 h-4"/> Kolumna
                            </button>
                        )}

                        <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-900/20 flex items-center gap-2 ml-auto xl:ml-0">
                            <Plus className="w-4 h-4"/> Zadanie
                        </button>
                    </div>
                </div>

                {/* KANBAN COLUMNS (DYNAMICZNE) */}
                <div className="flex gap-5 h-full overflow-x-auto pb-4 w-full">
                    {columns.map((col, index) => (
                        <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col h-full">
                            <Column
                                colData={col}
                                color="border-neutral-800"
                                bg="bg-neutral-900/20"
                                tasks={filteredTasks.filter(t => t.status === col.id)}
                                onDrop={handleDrop}
                                onDragStart={handleDragStart}
                                onDeleteTask={handleDeleteTask}
                                onDeleteColumn={handleDeleteColumn}
                                onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
                                userRole={userRole}
                                prevCol={index > 0 ? columns[index - 1].id : null}
                                nextCol={index < columns.length - 1 ? columns[index + 1].id : null}
                                onMoveTask={moveTask}
                            />
                        </div>
                    ))}
                    {columns.length === 0 && <div className="text-center w-full py-20 text-neutral-600">Brak kolumn. Dodaj pierwszą!</div>}
                </div>

            </main>
        </div>
    );
}

// --- KOMPONENT KOLUMNY ---
function Column({ colData, color, bg, tasks, onDrop, onDragStart, onDeleteTask, onDeleteColumn, onEdit, userRole, prevCol, nextCol, onMoveTask }: any) {
    return (
        <div
            className={`flex flex-col rounded-xl border ${color} ${bg} h-full max-h-[calc(100vh-200px)] transition-colors`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, colData.id)}
        >
            <div className="p-3 border-b border-neutral-800/50 flex justify-between items-center shrink-0 group/col">
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest truncate">{colData.title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 bg-neutral-900/50 px-2 py-0.5 rounded-full">{tasks.length}</span>
                    {/* Usuwanie kolumny (ADMIN + MEMBER) */}
                    {(userRole === 'admin' || userRole === 'member') && (
                        <button onClick={() => onDeleteColumn(colData.id)} className="text-neutral-600 hover:text-red-500 opacity-0 group-hover/col:opacity-100 transition">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                {tasks.map((task: Task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onDelete={onDeleteTask}
                        onEdit={onEdit}
                        userRole={userRole}
                        onMovePrev={prevCol ? () => onMoveTask(task.id, prevCol) : null}
                        onMoveNext={nextCol ? () => onMoveTask(task.id, nextCol) : null}
                    />
                ))}
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
    const isOverdue = deadline && new Date() > deadline;
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
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${priorityStyles[task.priority]?.split(" ")[0].replace("border", "bg") || "bg-neutral-700"}`}></div>
            <div className="pl-2.5">
                <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityStyles[task.priority] || priorityStyles.low} bg-black/20`}>{task.priority}</span>

                    {/* USUWANIE ZADANIA (ADMIN + MEMBER) */}
                    {(userRole === 'admin' || userRole === 'member') && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></button>
                    )}
                </div>
                <h4 className="text-xs font-bold text-white leading-snug mb-1.5 line-clamp-2">{task.title}</h4>
                {totalSubs > 0 && <div className="mb-2"><div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden"><div style={{ width: `${progress}%` }} className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div></div></div>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800/50">
                    <div className="flex items-center gap-1.5">{task.assigneeName ? <><img src={task.assigneePhoto || `https://ui-avatars.com/api/?name=${task.assigneeName}`} className="w-4 h-4 rounded-full border border-neutral-700" /><span className="text-[9px] text-neutral-400 font-medium truncate max-w-[60px]">{task.assigneeName.split(" ")[0]}</span></> : <span className="text-[9px] text-neutral-600 italic">--</span>}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        {onMovePrev && <button onClick={(e) => { e.stopPropagation(); onMovePrev(); }} className="p-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"><ArrowLeft className="w-3 h-3" /></button>}
                        {onMoveNext && <button onClick={(e) => { e.stopPropagation(); onMoveNext(); }} className="p-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"><ArrowRight className="w-3 h-3" /></button>}
                    </div>
                    {deadline && <div className={`flex items-center gap-1 text-[9px] font-mono ${isOverdue ? 'text-red-500 font-bold animate-pulse' : 'text-neutral-500'}`}><Calendar className="w-2.5 h-2.5" />{deadline.toLocaleDateString('pl-PL', { month: 'numeric', day: 'numeric' })}</div>}
                </div>
            </div>
        </div>
    );
}

// --- KOMPONENT MODALU (DODAWANIE/EDYCJA) ---
function TaskModal({ onClose, users, user, initialData, columns }: any) {
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

        // Domyślna kolumna
        const defaultStatus = columns && columns.length > 0 ? columns[0].id : 'todo';

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
        else await addDoc(collection(db, "board_tasks"), { ...data, status: defaultStatus, createdAt: serverTimestamp() });
        onClose();
    };

    const addSubtask = (e: React.MouseEvent) => { e.preventDefault(); if(!newSubtask.trim()) return; setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask, isDone: false }]); setNewSubtask(""); };
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
                        <div><label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Priorytet</label><select className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={priority} onChange={e => setPriority(e.target.value)}><option value="low">Niski 🟢</option><option value="medium">Średni 🔵</option><option value="high">Wysoki 🟠</option><option value="critical">KRYTYCZNY 🔥</option></select></div>
                        <div><label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Termin</label><input type="date" className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={date} onChange={e => setDate(e.target.value)} /></div>
                    </div>
                    <div className="bg-[#161616] p-4 rounded-xl border border-neutral-800"><label className="text-[10px] text-neutral-500 font-bold uppercase mb-2 block flex items-center gap-2"><ListTodo className="w-3 h-3"/> Checklista</label><div className="space-y-2 mb-3">{subtasks.map(st => (<div key={st.id} className="flex items-center gap-3 group"><input type="checkbox" checked={st.isDone} onChange={() => toggleSubtask(st.id)} className="accent-blue-500 w-4 h-4 cursor-pointer" /><span className={`text-sm flex-1 ${st.isDone ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>{st.text}</span><button type="button" onClick={() => removeSubtask(st.id)} className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X className="w-3.5 h-3.5"/></button></div>))}</div><div className="flex gap-2"><input type="text" className="flex-1 bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white outline-none" placeholder="Dodaj krok..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask(e as any)} /><button type="button" onClick={addSubtask} className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded text-xs font-bold"><Plus className="w-4 h-4"/></button></div></div>
                    <div><label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Przypisz do</label><select className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none" value={assigneeUid} onChange={e => setAssigneeUid(e.target.value)}><option value="">-- Brak --</option>{users.map((u:any) => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}</select></div>
                    <div><label className="text-[10px] text-neutral-500 font-bold uppercase mb-1 block">Opis</label><textarea rows={4} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-sm text-white focus:border-blue-600 outline-none resize-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Szczegóły..." /></div>
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm mt-2 transition shadow-lg shadow-blue-900/20 shrink-0">Zapisz Zadanie</button>
                </form>
            </div>
        </div>
    );
}