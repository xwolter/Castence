import { useState } from "react";

const Badge = ({ status }) => {
    if (status === 'banned') return <span className="text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">Zbanowany</span>;
    if (status === 'clean') return <span className="text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">Czysty</span>;
    return <span className="text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">Oczekuje</span>;
};

export default function ReportCard({ report, userRole, userId, onEdit, onChangeStatus, onDelete, onRequestDelete }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`bg-neutral-900 rounded border p-4 flex flex-col transition hover:border-neutral-700 ${report.deletionRequested ? 'border-red-900/40 bg-red-950/10' : 'border-neutral-800'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded bg-neutral-800 overflow-hidden">
                        <img src={report.authorPhoto || "https://ui-avatars.com/api/?name=?"} className="w-full h-full object-cover opacity-80" alt="Avatar"/>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{report.suspectNick}</h3>
                        {report.discordId && <div className="text-[10px] text-neutral-500 font-mono">DC: {report.discordId}</div>}
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                            przez: <span className="text-neutral-400">{report.checkerNick}</span>
                            {userRole === 'admin' && report.authorRealName && (
                                <span className="ml-1 text-neutral-600">({report.authorRealName})</span>
                            )}
                        </div>
                    </div>
                </div>
                <Badge status={report.status} />
            </div>

            <div className="mb-4">
                <div className={`text-xs text-neutral-400 bg-neutral-950/30 p-2 rounded border border-neutral-800/30 overflow-hidden transition-all ${expanded ? '' : 'max-h-[3.2rem]'}`}>
                    {report.description || <span className="italic text-neutral-600">Brak opisu</span>}
                </div>
                {(report.description && report.description.length > 50) && (
                    <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-neutral-500 hover:text-white mt-1 underline ml-1">
                        {expanded ? "Zwiń" : "Pokaż więcej"}
                    </button>
                )}
            </div>

            <div className="mt-auto space-y-3">
                <a href={report.evidenceLink} target="_blank" rel="noopener noreferrer" className="block text-center w-full py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 rounded text-[10px] text-blue-400 hover:text-white transition">
                    Otwórz Dowód
                </a>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                    <span className="text-[10px] text-neutral-600 font-mono tracking-tighter">#{report.id.slice(0, 6)}</span>

                    <div className="flex gap-2">
                        {userRole === "admin" && (
                            <>
                                <button onClick={() => onEdit(report)} className="text-[10px] text-neutral-500 hover:text-white">Edytuj</button>
                                <span className="text-neutral-800">|</span>
                                <button onClick={() => onChangeStatus(report.id, 'clean')} className="text-[10px] text-emerald-600 hover:text-emerald-400">Czysty</button>
                                <button onClick={() => onChangeStatus(report.id, 'banned')} className="text-[10px] text-red-600 hover:text-red-400">Ban</button>
                                <span className="text-neutral-800">|</span>
                                <button onClick={() => onDelete(report.id)} className="text-[10px] text-neutral-600 hover:text-red-500">Usuń</button>
                            </>
                        )}

                        {userRole === "member" && (
                            report.authorUid === userId ? (
                                !report.deletionRequested && <button onClick={() => onRequestDelete(report.id)} className="text-[10px] text-red-500 hover:underline">Zgłoś usunięcie</button>
                            ) : null
                        )}
                    </div>
                </div>

                {report.deletionRequested && (
                    <div className="flex justify-between items-center bg-red-900/10 px-2 py-1 rounded border border-red-900/20">
                        <span className="text-[9px] text-red-500 font-bold uppercase">Zgłoszono do usunięcia</span>
                        {userRole === 'admin' && <button onClick={() => onDelete(report.id, true)} className="text-[9px] text-neutral-400 hover:text-white">Anuluj</button>}
                    </div>
                )}
            </div>
        </div>
    );
}