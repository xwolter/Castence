import { Link as LinkIcon, MessageSquare, FileText, User, X } from "lucide-react";

interface ReportFormProps {
    formData: any;
    setFormData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    editId: string | null;
    onCancelEdit: () => void;
}

export default function ReportForm({ formData, setFormData, onSubmit, editId, onCancelEdit }: ReportFormProps) {

    // Czy to jest tryb "Importu z API" (czyli dodajemy dowód do istniejącego bana)?
    // Poznajemy po tym, że jest editId (lub null w specyficznej logice page.tsx) i mamy wypełniony nick
    const isEditing = !!formData.suspectNick && (editId !== undefined);

    return (
        <form onSubmit={onSubmit} className="space-y-3">

            {/* 1. NICK GRACZA (Zablokowany przy edycji/imporcie, bo nie zmieniamy osoby, którą raportujemy) */}
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-emerald-500 transition">
                    <User className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    placeholder="Nick Gracza"
                    value={formData.suspectNick}
                    onChange={(e) => setFormData({ ...formData, suspectNick: e.target.value })}
                    disabled={isEditing} // Blokada edycji nicku przy imporcie
                    className={`w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition placeholder:text-neutral-600 ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* 2. DISCORD ID (To chcemy uzupełnić) */}
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-indigo-500 transition">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Discord ID (Opcjonalne)"
                        value={formData.discordId}
                        onChange={(e) => setFormData({ ...formData, discordId: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition placeholder:text-neutral-600 font-mono"
                    />
                </div>

                {/* 3. LINK DO DOWODU (Najważniejsze) */}
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-blue-500 transition">
                        <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Link do dowodu (YouTube/Imgur)"
                        value={formData.evidenceLink}
                        onChange={(e) => setFormData({ ...formData, evidenceLink: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 transition placeholder:text-neutral-600"
                    />
                </div>
            </div>

            {/* 4. OPIS (Krótki) */}
            <div className="relative group">
                <div className="absolute left-3 top-3 text-neutral-500 group-focus-within:text-yellow-500 transition">
                    <FileText className="w-4 h-4" />
                </div>
                <textarea
                    placeholder="Opis sytuacji / Powód bana (np. X-ray, KillAura)..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-yellow-500/50 transition placeholder:text-neutral-600 min-h-[80px] resize-none"
                />
            </div>

            {/* PRZYCISKI AKCJI */}
            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-emerald-900/20"
                >
                    {editId ? "Zapisz Zmiany" : "Dodaj Wpis"}
                </button>

                {/* Przycisk Anuluj widoczny zawsze, by łatwo zamknąć */}
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
}