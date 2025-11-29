import React from "react";
import { User, MessageSquare, Link as LinkIcon, FileText, Save, Plus, X, Shield, Pencil } from "lucide-react";

// --- TYPY ---
interface FormData {
    suspectNick: string;
    discordId: string;
    checkerNick: string;
    evidenceLink: string;
    description: string;
}

interface ReportFormProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onSubmit: (e: React.FormEvent) => void;
    editId: string | null;
    onCancelEdit: () => void;
}

// --- STAŁE STYLÓW (Dla czystości kodu) ---
const INPUT_STYLE = "w-full p-2.5 bg-[#161616] border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-700 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 outline-none transition-all duration-200";
const LABEL_STYLE = "text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 ml-1 mb-1.5";

export default function ReportForm({
                                       formData,
                                       setFormData,
                                       onSubmit,
                                       editId,
                                       onCancelEdit
                                   }: ReportFormProps) {
    return (
        <div className={`bg-[#0f0f0f] p-3 rounded-xl border transition-all duration-300 ${editId ? 'border-yellow-900/40 shadow-[0_0_30px_rgba(234,179,8,0.05)]' : 'border-neutral-800 shadow-2xl'}`}>

            {/* NAGŁÓWEK */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800/60">
                <h2 className={`text-xs font-black flex items-center gap-2 uppercase tracking-widest ${editId ? 'text-yellow-500' : 'text-white'}`}>
                    {editId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editId ? "Edycja Wpisu" : "Nowe Zgłoszenie"}
                </h2>
                {editId && (
                    <button
                        onClick={onCancelEdit}
                        className="text-[10px] font-bold text-neutral-500 hover:text-white flex items-center gap-1 transition bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-md hover:bg-neutral-800"
                    >
                        <X className="w-3 h-3" /> ANULUJ
                    </button>
                )}
            </div>

            <form onSubmit={onSubmit} className="space-y-5">

                {/* 1. NICK PODEJRZANEGO */}
                <div>
                    <label className={LABEL_STYLE}>
                        <User className="w-3 h-3" /> Nick Gracza <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="np. Steve123"
                        className={INPUT_STYLE}
                        value={formData.suspectNick}
                        onChange={(e) => setFormData({...formData, suspectNick: e.target.value})}
                    />
                </div>

                {/* 2. DISCORD ID */}
                <div>
                    <label className={LABEL_STYLE}>
                        <MessageSquare className="w-3 h-3" /> Discord ID
                    </label>
                    <input
                        type="text"
                        placeholder="np. 34857293..."
                        className={`${INPUT_STYLE} font-mono text-xs`}
                        value={formData.discordId}
                        onChange={(e) => setFormData({...formData, discordId: e.target.value})}
                    />
                </div>

                {/* 3. TWÓJ NICK */}
                <div>
                    <label className={LABEL_STYLE}>
                        <Shield className="w-3 h-3" /> Twój Nick <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Wpisz swój nick..."
                        className={INPUT_STYLE}
                        value={formData.checkerNick}
                        onChange={(e) => setFormData({...formData, checkerNick: e.target.value})}
                    />
                </div>

                {/* 4. LINK DOWODU */}
                <div>
                    <label className={LABEL_STYLE}>
                        <LinkIcon className="w-3 h-3" /> Link do dowodu
                        <span className="text-neutral-600 font-normal normal-case ml-auto opacity-70">(Opcjonalne)</span>
                    </label>
                    <input
                        type="url"
                        placeholder="https://..."
                        className={`${INPUT_STYLE} text-blue-400`}
                        value={formData.evidenceLink}
                        onChange={(e) => setFormData({...formData, evidenceLink: e.target.value})}
                    />
                </div>

                {/* 5. OPIS */}
                <div>
                    <label className={LABEL_STYLE}>
                        <FileText className="w-3 h-3" /> Notatka / Powód
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Krótki opis sytuacji..."
                        className={`${INPUT_STYLE} resize-none`}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                </div>

                {/* PRZYCISK ZAPISU */}
                <div className="pt-2">
                    <button
                        type="submit"
                        className={`w-full py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
                            editId
                                ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20'
                                : 'bg-white hover:bg-neutral-200 text-black shadow-white/5 border border-transparent'
                        }`}
                    >
                        {editId ? <><Save className="w-4 h-4" /> Zapisz Zmiany</> : <><Plus className="w-4 h-4" /> Dodaj do Bazy</>}
                    </button>
                </div>
            </form>
        </div>
    );
}