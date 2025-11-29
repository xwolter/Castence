import { useState } from "react";
import { updateProfile, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Settings, User, Lock } from "lucide-react"; // IKONY

export default function SettingsModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [newNick, setNewNick] = useState(user.displayName || "");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleUpdateNick = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await updateProfile(user, { displayName: newNick });
            await updateDoc(doc(db, "users", user.uid), { displayName: newNick });
            setMessage({ type: 'success', text: "Nick zaktualizowany." });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        }
        setLoading(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        if (newPassword.length < 6) {
            setLoading(false);
            return setMessage({ type: 'error', text: "Hasło min. 6 znaków." });
        }
        try {
            await updatePassword(user, newPassword);
            setMessage({ type: 'success', text: "Hasło zmienione." });
            setNewPassword("");
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 w-full max-w-md rounded-xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden">

                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Settings className="w-4 h-4 text-neutral-400" />
                        Ustawienia Konta
                    </h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {message && (
                        <div className={`p-3 rounded text-xs font-medium text-center ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdateNick} className="space-y-3">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> Nazwa Wyświetlana
                        </label>
                        <div className="flex gap-2">
                            <input type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-white focus:border-neutral-600 outline-none" value={newNick} onChange={(e) => setNewNick(e.target.value)} />
                            <button disabled={loading} type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 rounded text-xs font-bold border border-neutral-700 transition">Zapisz</button>
                        </div>
                    </form>

                    <div className="border-t border-neutral-800"></div>

                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Hasło
                        </label>
                        <div className="flex gap-2">
                            <input type="password" className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-white focus:border-neutral-600 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nowe hasło" />
                            <button disabled={loading} type="submit" className="bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-900/30 px-4 rounded text-xs font-bold transition">Zmień</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}