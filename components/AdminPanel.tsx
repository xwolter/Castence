import { useState } from "react";
import { X, Shield, Pencil, Ban, Check, UserCheck, Search } from "lucide-react"; // Ikony

interface AdminPanelProps {
    onClose: () => void;
    usersList: any[];
    changeUserRole: (uid: string, role: string) => void;
    updateUserNick: (uid: string, newNick: string) => void;
}

export default function AdminPanel({ onClose, usersList, changeUserRole, updateUserNick }: AdminPanelProps) {
    const [tab, setTab] = useState<'active' | 'pending'>('active');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempNick, setTempNick] = useState("");
    const [search, setSearch] = useState(""); // Dodalem mini szukajke w adminie

    const startEditing = (user: any) => { setEditingId(user.uid); setTempNick(user.displayName || ""); };
    const cancelEditing = () => { setEditingId(null); setTempNick(""); };
    const saveEditing = (uid: string) => { updateUserNick(uid, tempNick); setEditingId(null); };

    const filteredUsers = usersList.filter(u =>
        (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase())
    );

    const pendingUsers = filteredUsers.filter(u => u.role === 'pending');
    const activeUsers = filteredUsers.filter(u => u.role !== 'pending');
    const displayList = tab === 'active' ? activeUsers : pendingUsers;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 w-full max-w-5xl rounded-xl border border-neutral-800 shadow-2xl flex flex-col max-h-[85vh]">

                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 rounded-t-xl">
                    <div className="flex gap-4 items-center">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-neutral-400" />
                            Administracja
                        </h2>

                        <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                            <button onClick={() => setTab('active')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${tab === 'active' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                Aktywni
                            </button>
                            <button onClick={() => setTab('pending')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-2 ${tab === 'pending' ? 'bg-yellow-900/20 text-yellow-500' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                Oczekujący
                                {usersList.filter(u => u.role === 'pending').length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-2 text-neutral-600" />
                            <input type="text" placeholder="Szukaj usera..." className="bg-neutral-950 border border-neutral-800 rounded-md py-1 pl-7 pr-2 text-xs text-white focus:border-neutral-600 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <button onClick={onClose} className="text-neutral-500 hover:text-white p-1"><X className="w-5 h-5"/></button>
                    </div>
                </div>

                <div className="overflow-y-auto p-0 flex-grow bg-neutral-950/30">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-950 text-neutral-500 sticky top-0 border-b border-neutral-800 z-10">
                        <tr>
                            <th className="p-4 font-medium w-1/3">Użytkownik</th>
                            <th className="p-4 font-medium">Rola</th>
                            <th className="p-4 font-medium text-right">Zarządzaj</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                        {displayList.map((u: any) => (
                            <tr key={u.uid} className="hover:bg-neutral-900/50 transition-colors group">
                                <td className="p-4">
                                    {editingId === u.uid ? (
                                        <div className="flex gap-2 items-center">
                                            <input type="text" className="bg-neutral-950 border border-emerald-500/50 rounded px-2 py-1 text-white outline-none w-full" value={tempNick} onChange={(e) => setTempNick(e.target.value)} autoFocus />
                                            <button onClick={() => saveEditing(u.uid)} className="p-1 bg-emerald-500/20 text-emerald-500 rounded"><Check className="w-3 h-3"/></button>
                                            <button onClick={cancelEditing} className="p-1 text-neutral-500 hover:text-white"><X className="w-3 h-3"/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <img src={u.photoURL || "https://ui-avatars.com/api/?name=?"} className="w-8 h-8 rounded-full border border-neutral-800" alt="avatar"/>
                                            <div>
                                                <div className="font-bold text-neutral-200">{u.displayName}</div>
                                                <div className="text-neutral-600">{u.email}</div>
                                            </div>
                                        </div>
                                    )}
                                </td>

                                <td className="p-4">
                                        <span className={`uppercase text-[10px] font-bold px-2 py-1 rounded border ${
                                            u.role === 'admin' ? 'text-red-400 border-red-900/30 bg-red-900/10' :
                                                u.role === 'member' ? 'text-blue-400 border-blue-900/30 bg-blue-900/10' :
                                                    'text-yellow-400 border-yellow-900/30 bg-yellow-900/10'
                                        }`}>
                                            {u.role}
                                        </span>
                                </td>

                                <td className="p-4 text-right">
                                    {editingId !== u.uid && (
                                        <div className="flex justify-end gap-2 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                                            {tab === 'pending' ? (
                                                <button onClick={() => changeUserRole(u.uid, 'member')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded flex items-center gap-1 font-bold shadow-lg shadow-emerald-900/20">
                                                    <UserCheck className="w-3 h-3" /> Akceptuj
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEditing(u)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded border border-transparent hover:border-neutral-700 transition" title="Zmień nick">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button onClick={() => changeUserRole(u.uid, u.role === 'admin' ? 'member' : 'admin')} className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded border border-transparent hover:border-blue-900/30 transition" title="Zmień rangę">
                                                        <Shield className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button onClick={() => changeUserRole(u.uid, 'pending')} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded border border-transparent hover:border-red-900/30 transition" title="Zablokuj">
                                                        <Ban className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}