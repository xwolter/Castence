import Link from "next/link";
import { useState } from "react";
import SettingsModal from "./SettingsModal";
import {
    LayoutDashboard,
    FileText,
    Trophy,
    Shield,
    LogOut,
    Settings,
    Siren,
    Search,
    Menu,
    X,
    KanbanSquare // <--- IKONA TABLICY
} from "lucide-react";

interface HeaderProps {
    user: any;
    userRole: string;
    stats: { total: number; banned: number };
    onLogout: () => void;
    onOpenAdmin: () => void;
    onSearchPlayer?: (nick: string) => void;
}

export default function Header({ user, userRole, stats, onLogout, onOpenAdmin, onSearchPlayer }: HeaderProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearchSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim().length > 0) {
            if (onSearchPlayer) {
                onSearchPlayer(searchQuery);
                setSearchQuery("");
                setIsMobileMenuOpen(false);
            }
        }
    };

    return (
        <>
            {showSettings && (
                <SettingsModal user={user} onClose={() => setShowSettings(false)} />
            )}

            <header className="border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-40 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

                    {/* --- LEWA STRONA --- */}
                    <div className="flex items-center gap-8 shrink-0">
                        <h1 className="text-base font-bold tracking-tight text-white mr-2 flex items-center gap-2">
                            <span className="hidden sm:inline">Castence</span>
                        </h1>

                        <nav className="hidden md:flex gap-1">
                            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition">
                                <LayoutDashboard className="w-4 h-4" /> Panel
                            </Link>
                            <Link href="/wanted" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-md transition">
                                <Siren className="w-4 h-4" /> List Gończy
                            </Link>

                            {/* NOWA ZAKŁADKA: TABLICA */}
                            <Link href="/board" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-900/10 rounded-md transition">
                                <KanbanSquare className="w-4 h-4" /> Tablica
                            </Link>

                            <Link href="/notes" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition">
                                <FileText className="w-4 h-4" /> Buraczki
                            </Link>
                            <Link href="/rankings" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md transition">
                                <Trophy className="w-4 h-4" /> Rankingi
                            </Link>
                        </nav>
                    </div>

                    {/* --- ŚRODEK (WYSZUKIWARKA) --- */}
                    <div className="hidden md:block flex-1 max-w-md mx-auto">
                        <div className="relative group">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-neutral-700 bg-neutral-800 transition-transform group-focus-within:scale-110">
                                <img src={`https://visage.surgeplay.com/face/64/${searchQuery || 'MHF_Steve'}`} alt="head" className="w-full h-full object-cover" />
                            </div>
                            <input
                                type="text"
                                placeholder="Sprawdź kartotekę gracza..."
                                className="w-full bg-[#0a0a0a] border border-neutral-800 text-neutral-200 text-xs rounded-lg py-2.5 pl-10 pr-10 focus:border-neutral-600 focus:bg-neutral-900 focus:outline-none transition-all placeholder:text-neutral-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600"><Search className="w-3.5 h-3.5" /></div>
                        </div>
                    </div>

                    {/* --- PRAWA STRONA --- */}
                    <div className="flex items-center gap-3 md:gap-6 shrink-0">
                        <div className="hidden lg:flex gap-4 text-xs text-neutral-500 border-r border-neutral-800 pr-6">
                            <div className="flex flex-col items-end leading-none gap-1">
                                <span className="text-[10px] uppercase font-bold text-neutral-600">Baza</span>
                                <span className="text-neutral-300 font-mono">{stats.total || 0}</span>
                            </div>
                            <div className="flex flex-col items-end leading-none gap-1">
                                <span className="text-[10px] uppercase font-bold text-neutral-600">Bany</span>
                                <span className="text-red-400 font-mono">{stats.banned || 0}</span>
                            </div>
                        </div>

                        {userRole === "admin" && (
                            <button onClick={onOpenAdmin} className="hidden md:flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-white transition px-3 py-1.5 border border-neutral-800 rounded bg-neutral-900 hover:bg-neutral-800">
                                <Shield className="w-3 h-3" /> Admin
                            </button>
                        )}

                        <div className="flex items-center gap-2 md:gap-3">
                            <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition">
                                <Settings className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={onLogout} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-900/10 rounded-md transition">
                                <LogOut className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden w-8 h-8 flex items-center justify-center text-white bg-neutral-800 rounded-md ml-2">
                                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MENU MOBILNE --- */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-neutral-950 border-b border-neutral-800 p-4 shadow-2xl animate-in slide-in-from-top-5 z-50 flex flex-col gap-4">
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded overflow-hidden border border-neutral-700 bg-neutral-800">
                                <img src={`https://visage.surgeplay.com/face/64/${searchQuery || 'MHF_Steve'}`} alt="head" className="w-full h-full object-cover" />
                            </div>
                            <input
                                type="text"
                                placeholder="Szukaj gracza..."
                                className="w-full bg-[#0a0a0a] border border-neutral-800 text-neutral-200 text-sm rounded-lg py-3 pl-11 pr-10 focus:border-neutral-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600"><Search className="w-4 h-4" /></div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-neutral-900/50 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition">
                                <LayoutDashboard className="w-5 h-5 text-neutral-500" /> Panel Główny
                            </Link>
                            <Link href="/wanted" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-red-900/10 rounded-lg text-red-400 hover:bg-red-900/20 transition">
                                <Siren className="w-5 h-5" /> List Gończy
                            </Link>

                            {/* MOBILNY LINK DO TABLICY */}
                            <Link href="/board" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-blue-900/10 rounded-lg text-blue-400 hover:bg-blue-900/20 transition">
                                <KanbanSquare className="w-5 h-5" /> Tablica
                            </Link>

                            <Link href="/notes" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-neutral-900/50 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 transition">
                                <FileText className="w-5 h-5 text-neutral-500" /> Buraczki
                            </Link>
                            <Link href="/rankings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-yellow-900/10 rounded-lg text-yellow-500 hover:bg-yellow-900/20 transition">
                                <Trophy className="w-5 h-5" /> Rankingi
                            </Link>
                        </div>

                        <div className="border-t border-neutral-800 pt-4 flex justify-between items-center">
                            <div className="flex gap-4 text-xs text-neutral-500">
                                <div>Baza: <span className="text-white font-bold">{stats.total || 0}</span></div>
                                <div>Bany: <span className="text-red-400 font-bold">{stats.banned || 0}</span></div>
                            </div>
                            {userRole === "admin" && (
                                <button onClick={() => { onOpenAdmin(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg">
                                    <Shield className="w-3 h-3" /> Admin
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}