import { useState } from "react";
import {
    ExternalLink, Trash2, Pencil, CheckCircle, Ban, Clock, AlertTriangle,
    Copy, User, FileX, Info, Lock, MessageSquare, Edit3
} from "lucide-react";
import CommentsSection from "./CommentsSection";

// --- TYPY DANYCH ---
export interface Report {
    id: string;
    suspectNick: string;
    checkerNick: string;
    status: 'pending' | 'banned' | 'clean';
    evidenceLink: string;
    description: string;
    discordId?: string;
    authorUid: string;
    authorPhoto?: string;
    authorRealName?: string;
    deletionRequested?: boolean;
    lastEditedBy?: string;
    commentsCount?: number; // <--- NOWE POLE Z LICZNIKIEM
}

interface ReportCardProps {
    report: Report;
    userRole: string;
    userId: string | undefined;
    user: any;
    onEdit: (report: Report) => void;
    onChangeStatus: (id: string, status: string) => void;
    onDelete: (id: string, cancel?: boolean) => void;
    onRequestDelete: (id: string) => void;
    onOpenHistory: (nick: string) => void;
}

export default function ReportCard({
                                       report,
                                       userRole,
                                       userId,
                                       user,
                                       onEdit,
                                       onChangeStatus,
                                       onDelete,
                                       onRequestDelete,
                                       onOpenHistory
                                   }: ReportCardProps) {

    const [expanded, setExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [copiedDc, setCopiedDc] = useState(false);

    const copyDiscord = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedDc(true);
        setTimeout(() => setCopiedDc(false), 2000);
    };

    const isAdmin = userRole === 'admin';
    const isMember = userRole === 'member';
    const canChangeStatus = isAdmin || (isMember && (report.status === 'pending' || !report.status));

    const handleStatusClick = (newStatus: string) => {
        if (isMember && !isAdmin) {
            if (window.confirm("⚠️ UWAGA: Jako Członek możesz podjąć decyzję tylko raz.\n\nCzy na pewno?")) {
                onChangeStatus(report.id, newStatus);
            }
        } else {
            onChangeStatus(report.id, newStatus);
        }
    };

    const renderStatus = () => {
        switch (report.status) {
            case 'banned': return <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/20 border border-red-900/40 px-2.5 py-1 rounded-md shadow-sm shadow-red-900/10"><Ban className="w-3 h-3" /> Zbanowany</span>;
            case 'clean': return <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-md shadow-sm shadow-emerald-900/10"><CheckCircle className="w-3 h-3" /> Czysty</span>;
            default: return <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-500 bg-yellow-950/20 border border-yellow-900/40 px-2.5 py-1 rounded-md shadow-sm shadow-yellow-900/10"><Clock className="w-3 h-3" /> Oczekuje</span>;
        }
    };

    // --- SPRAWDZAMY CZY SĄ KOMENTARZE ---
    const hasComments = (report.commentsCount || 0) > 0;

    return (
        <div className={`relative flex flex-col bg-[#0f0f0f] border rounded-xl overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:shadow-xl ${report.deletionRequested ? 'border-red-900/60 shadow-[0_0_15px_rgba(127,29,29,0.1)]' : 'border-neutral-800'}`}>

            <div className="p-5 pb-2">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3.5">
                        <div className="relative">
                            <img
                                src={`https://visage.surgeplay.com/face/128/${report.suspectNick}`}
                                onError={(e) => { e.currentTarget.src = "https://visage.surgeplay.com/face/128/MHF_Steve" }}
                                className="w-11 h-11 rounded-lg object-cover bg-neutral-900 border border-neutral-800 shadow-lg image-pixelated"
                                alt="Skin"
                            />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => onOpenHistory(report.suspectNick)} className="text-base font-bold text-white tracking-tight hover:text-blue-400 hover:underline decoration-blue-500/50 underline-offset-4 transition flex items-center gap-1.5 group/nick">
                                    {report.suspectNick}
                                    <Info className="w-3 h-3 text-neutral-600 opacity-0 group-hover/nick:opacity-100 transition-opacity" />
                                </button>
                                {report.discordId && (
                                    <button onClick={(e) => copyDiscord(e, report.discordId!)} className={`flex items-center gap-1 text-[9px] font-mono border px-1.5 py-0.5 rounded transition ${copiedDc ? 'border-emerald-900 text-emerald-400 bg-emerald-900/10' : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300 bg-neutral-900'}`} title="Skopiuj Discord ID">
                                        {copiedDc ? "SKOPIOWANO" : report.discordId} {!copiedDc && <Copy className="w-2.5 h-2.5" />}
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col mt-1 gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    <img src={report.authorPhoto || `https://ui-avatars.com/api/?name=${report.checkerNick}`} className="w-3.5 h-3.5 rounded-full opacity-70" alt="Admin"/>
                                    <span className="text-[11px] text-neutral-500"><span className="text-neutral-300 font-medium">{report.checkerNick}</span></span>
                                </div>
                                {report.lastEditedBy && <div className="flex items-center gap-1 text-[9px] text-neutral-600 italic"><Edit3 className="w-2.5 h-2.5" /> Edytowane przez: {report.lastEditedBy}</div>}
                            </div>
                        </div>
                    </div>
                    {renderStatus()}
                </div>
            </div>

            <div className="px-5 mb-4">
                <div className="text-xs text-neutral-300 bg-neutral-900/40 p-3.5 rounded-lg border border-neutral-800/60 leading-relaxed font-normal whitespace-pre-wrap">
                    <div className={`overflow-hidden transition-all duration-300 ${expanded ? '' : 'max-h-[3.8rem] line-clamp-3'}`}>
                        {report.description || <span className="text-neutral-600 italic">Brak dodatkowego opisu.</span>}
                    </div>
                    {(report.description && report.description.length > 100) && (
                        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-neutral-500 hover:text-white mt-2 font-bold uppercase tracking-wider block w-full text-left transition-colors">
                            {expanded ? "Zwiń treść" : "... Czytaj więcej"}
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-auto bg-[#111] border-t border-neutral-800 p-3 flex items-center justify-between gap-3">

                {/* LINKI I KOMENTARZE */}
                <div className="flex gap-2">
                    {report.evidenceLink ? (
                        <a href={report.evidenceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 rounded-lg text-[10px] font-bold text-neutral-300 hover:text-white transition shadow-sm">
                            <ExternalLink className="w-3.5 h-3.5 text-blue-500" /> Dowód
                        </a>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/30 border border-neutral-800/30 rounded-lg text-[10px] font-bold text-neutral-600 cursor-not-allowed select-none">
                            <FileX className="w-3.5 h-3.5" /> Brak
                        </div>
                    )}

                    {/* --- ULEPSZONY PRZYCISK KOMENTARZY --- */}
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={`
                            flex items-center gap-2 px-3 py-2 border rounded-lg text-[10px] font-bold transition group
                            ${showComments
                            ? 'bg-neutral-800 text-white border-neutral-600'
                            : hasComments
                                ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-950/40 hover:border-indigo-500/50'
                                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
                        }
                        `}
                    >
                        <MessageSquare className={`w-3.5 h-3.5 ${hasComments ? 'text-indigo-400 fill-indigo-400/20' : ''}`} />
                        {hasComments ? `Komentarze (${report.commentsCount})` : 'Komentarze'}
                    </button>
                </div>

                {/* PASEK NARZĘDZI */}
                <div className="flex items-center gap-1 pl-2 border-l border-neutral-800/50">
                    {isAdmin && <IconButton onClick={() => onEdit(report)} icon={<Pencil className="w-3.5 h-3.5" />} tip="Edytuj wpis" />}
                    {canChangeStatus ? (
                        <div className="flex flex-col items-end relative group/status">
                            {isMember && <span className="absolute bottom-full right-0 mb-1 text-[9px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded opacity-0 group-hover/status:opacity-100 transition z-10 pointer-events-none">Wybór jednorazowy!</span>}
                            <div className="flex items-center gap-0.5 bg-neutral-900/80 rounded-lg border border-neutral-800 p-0.5 mx-1">
                                <StatusButton active={report.status === 'clean'} onClick={() => handleStatusClick('clean')} color="text-emerald-500 hover:bg-emerald-950" icon={<CheckCircle className="w-3.5 h-3.5" />} title="Czysty" />
                                <StatusButton active={report.status === 'banned'} onClick={() => handleStatusClick('banned')} color="text-red-500 hover:bg-red-950" icon={<Ban className="w-3.5 h-3.5" />} title="Ban" />
                                {isAdmin && <StatusButton active={report.status === 'pending'} onClick={() => handleStatusClick('pending')} color="text-yellow-500 hover:bg-yellow-950" icon={<Clock className="w-3.5 h-3.5" />} title="Cofnij" />}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 mx-1 bg-neutral-900/50 border border-neutral-800 rounded-lg cursor-not-allowed opacity-70" title="Decyzja zatwierdzona">
                            <Lock className="w-3 h-3 text-neutral-500" />
                            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Zatwierdzone</span>
                        </div>
                    )}
                    <div className="ml-2">
                        {isAdmin ? (
                            <IconButton onClick={() => onDelete(report.id)} icon={<Trash2 className="w-3.5 h-3.5" />} color="text-neutral-500 hover:text-red-500 hover:bg-red-950/20" tip="Usuń trwale" />
                        ) : (
                            report.authorUid === userId && !report.deletionRequested && (
                                <IconButton onClick={() => onRequestDelete(report.id)} icon={<Trash2 className="w-3.5 h-3.5" />} color="text-neutral-500 hover:text-red-400 hover:bg-red-950/20" tip="Zgłoś do usunięcia" />
                            )
                        )}
                    </div>
                </div>
            </div>

            {showComments && <CommentsSection reportId={report.id} user={user} userRole={userRole} />}

            {report.deletionRequested && (
                <div className="absolute inset-x-0 bottom-0 bg-red-950/95 backdrop-blur-sm p-3 border-t border-red-900 flex justify-between items-center animate-in slide-in-from-bottom-2 z-10">
                    <div className="flex items-center gap-2 text-red-200 text-[10px] font-bold uppercase tracking-wider"><AlertTriangle className="w-4 h-4 text-red-500" /> Zgłoszono do usunięcia</div>
                    {isAdmin && <div className="flex gap-2"><button onClick={() => onDelete(report.id, true)} className="text-[10px] text-red-300 hover:text-white underline decoration-red-700 underline-offset-2 transition">Odrzuć</button><button onClick={() => onDelete(report.id)} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded font-bold transition shadow-lg shadow-red-900/20">Potwierdź</button></div>}
                </div>
            )}
        </div>
    );
}

function IconButton({ onClick, icon, color = "text-neutral-400 hover:text-white hover:bg-neutral-800", tip }: any) {
    return <button onClick={onClick} className={`p-2 rounded-md transition-all ${color}`} title={tip}>{icon}</button>;
}
function StatusButton({ onClick, icon, color, title, active }: any) {
    return <button onClick={onClick} className={`p-1.5 rounded-md transition-all ${active ? 'bg-neutral-800 ring-1 ring-inset ring-white/10 ' + color : 'text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800'}`} title={title}>{icon}</button>;
}