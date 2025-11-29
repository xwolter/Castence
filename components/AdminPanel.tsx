import { useState } from "react";

// Definicja typów dla propsów (To naprawia błąd)
interface AdminPanelProps {
    onClose: () => void;
    usersList: any[]; // Można tu dać dokładniejszy typ, ale any[] wystarczy do builda
    changeUserRole: (uid: string, role: string) => void;
    addPinsToDb: () => void;
    newPinInput: string;
    setNewPinInput: (value: string) => void;
    availablePinsCount: number;
    oceanApiKey: string;
    setOceanApiKey: (value: string) => void;
    saveApiKey: () => void;
    isApiKeySaved: boolean;
}

export default function AdminPanel({
                                       onClose,
                                       usersList,
                                       changeUserRole,
                                       addPinsToDb,
                                       newPinInput,
                                       setNewPinInput,
                                       availablePinsCount,
                                       oceanApiKey,
                                       setOceanApiKey,
                                       saveApiKey,
                                       isApiKeySaved
                                   }: AdminPanelProps) {

    const [adminTab, setAdminTab] = useState("users");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 w-full max-w-4xl rounded border border-neutral-800 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                    <div className="flex gap-1 bg-neutral-900 p-1 rounded border border-neutral-800">
                        {['users', 'pins', 'api'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setAdminTab(tab)}
                                className={`px-3 py-1 text-xs font-medium rounded transition ${adminTab === tab ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                {tab === 'users' && 'Użytkownicy'}
                                {tab === 'pins' && 'Dystrybucja PIN'}
                                {tab === 'api' && 'Integracje API'}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white text-xs uppercase font-bold px-2">Zamknij</button>
                </div>

                <div className="overflow-y-auto p-0 flex-grow">
                    {adminTab === "users" && (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-950 text-neutral-500 sticky top-0 border-b border-neutral-800">
                            <tr><th className="p-3 font-normal">Użytkownik</th><th className="p-3 font-normal">Ranga</th><th className="p-3 font-normal text-right">Akcje</th></tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                            {usersList.map((u: any) => (
                                <tr key={u.uid} className="hover:bg-neutral-800/50">
                                    <td className="p-3">
                                        <div className="font-medium text-neutral-300">{u.displayName}</div>
                                        <div className="text-neutral-600">{u.email}</div>
                                    </td>
                                    <td className="p-3"><span className="uppercase text-[10px] font-bold text-neutral-500">{u.role}</span></td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => changeUserRole(u.uid, u.role === 'admin' ? 'member' : 'admin')} className="border border-neutral-700 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400">Ranga</button>
                                        <button onClick={() => changeUserRole(u.uid, u.role === 'pending' ? 'member' : 'pending')} className="border border-neutral-700 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400">Dostęp</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}

                    {adminTab === "pins" && (
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-white mb-2">Magazyn Kodów (Licencji)</h3>
                            <p className="text-xs text-neutral-500 mb-4">Wklej tutaj kody (PINy), które gracze będą mogli odebrać.</p>
                            <textarea
                                className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded p-3 text-xs text-white font-mono placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600"
                                placeholder="LICENSE-AAAA-BBBB&#10;LICENSE-CCCC-DDDD"
                                value={newPinInput}
                                onChange={(e) => setNewPinInput(e.target.value)}
                            ></textarea>
                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-xs text-neutral-400">Dostępne: <strong className="text-white">{availablePinsCount}</strong></span>
                                <button onClick={addPinsToDb} className="bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-4 py-2 rounded text-xs font-bold hover:bg-emerald-900/50 transition">Dodaj do bazy</button>
                            </div>
                        </div>
                    )}

                    {adminTab === "api" && (
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white">Ocean API Connection</h3>
                                    <p className="text-xs text-neutral-500 mt-1">Wklej tutaj klucz ze zdjęcia.</p>
                                </div>
                                {isApiKeySaved && <span className="text-emerald-500 text-[10px] border border-emerald-900 bg-emerald-900/10 px-2 py-1 rounded uppercase font-bold">Aktywny</span>}
                            </div>
                            <div className="space-y-3 max-w-lg">
                                <input
                                    type="password"
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-white font-mono focus:border-blue-900 outline-none"
                                    value={oceanApiKey}
                                    onChange={(e) => setOceanApiKey(e.target.value)}
                                    placeholder="sk_live_..."
                                />
                                <button onClick={saveApiKey} className="w-full py-2 bg-blue-900/20 text-blue-400 border border-blue-900/50 rounded text-xs font-bold hover:bg-blue-900/40">Zapisz Konfigurację</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}