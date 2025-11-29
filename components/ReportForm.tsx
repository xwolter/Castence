export default function ReportForm({ formData, setFormData, onSubmit, editId, onCancelEdit }) {
    return (
        <div className={`bg-neutral-900 p-5 rounded border transition-colors ${editId ? 'border-yellow-500/30' : 'border-neutral-800'}`}>
            <h2 className="text-sm font-semibold text-white mb-4 flex justify-between items-center">
                {editId ? "Edytuj Wpis" : "Dodaj Zgłoszenie"}
                {editId && <button onClick={onCancelEdit} className="text-xs text-neutral-500 hover:text-white underline">Anuluj</button>}
            </h2>

            <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Nick Podejrzanego</label>
                    <input type="text" placeholder="Nick..." className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:border-neutral-600 outline-none" value={formData.suspectNick} onChange={(e) => setFormData({...formData, suspectNick: e.target.value})} />
                </div>

                <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Discord ID (Opcjonalne)</label>
                    <input type="text" placeholder="np. 34857..." className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:border-neutral-600 outline-none font-mono" value={formData.discordId} onChange={(e) => setFormData({...formData, discordId: e.target.value})} />
                </div>

                <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Twój Nick (z gry)</label>
                    <input type="text" placeholder="Twój nick..." className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-300 focus:border-neutral-600 outline-none" value={formData.checkerNick} onChange={(e) => setFormData({...formData, checkerNick: e.target.value})} />
                </div>

                <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Link do dowodu</label>
                    <input type="url" placeholder="https://..." className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-blue-400 focus:border-neutral-600 outline-none" value={formData.evidenceLink} onChange={(e) => setFormData({...formData, evidenceLink: e.target.value})} />
                </div>

                <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Opis</label>
                    <textarea rows="4" placeholder="Opisz sytuację..." className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:border-neutral-600 outline-none resize-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>

                <button type="submit" className={`w-full py-2 rounded text-xs font-medium transition mt-2 ${editId ? 'bg-yellow-700 hover:bg-yellow-600 text-white' : 'bg-neutral-100 hover:bg-white text-neutral-900'}`}>
                    {editId ? "Zapisz" : "Dodaj"}
                </button>
            </form>
        </div>
    );
}