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
    Siren // <--- NOWA IKONA
} from "lucide-react";

interface HeaderProps {
    user: any;
    userRole: string;
    stats: { total: number; banned: number };
    onLogout: () => void;
    onOpenAdmin: () => void;
}

export default function Header({ user, userRole, stats, onLogout, onOpenAdmin }: HeaderProps) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            {showSettings && (
                <SettingsModal user={user} onClose={() => setShowSettings(false)} />
            )}

            <header className="border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-40 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    <div className="flex items-center gap-8">
                        <h1 className="text-base font-bold tracking-tight text-white mr-2 flex items-center gap-2">
                            Castence
                        </h1>

                        <nav className="flex gap-1">
                            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition">
                                <LayoutDashboard className="w-4 h-4" />
                                Panel
                            </Link>

                            {/* NOWA ZAKŁADKA LIST GOŃCZY */}
                            <Link href="/wanted" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-md transition">
                                <Siren className="w-4 h-4" />
                                List Gończy
                            </Link>

                            <Link href="/notes" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-md transition">
                                <FileText className="w-4 h-4" />
                                Buraczki
                            </Link>
                            <Link href="/rankings" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-md transition">
                                <Trophy className="w-4 h-4" />
                                Rankingi
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex gap-4 text-xs text-neutral-500 border-r border-neutral-800 pr-6">
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
                            <button
                                onClick={onOpenAdmin}
                                className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-white transition px-3 py-1.5 border border-neutral-800 rounded bg-neutral-900 hover:bg-neutral-800"
                            >
                                <Shield className="w-3 h-3" />
                                Admin
                            </button>
                        )}

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-neutral-300 hidden sm:block">
                                {user?.displayName}
                            </span>

                            <button
                                onClick={() => setShowSettings(true)}
                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition"
                            >
                                <Settings className="w-4 h-4" />
                            </button>

                            <button
                                onClick={onLogout}
                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-red-900/10 rounded-md transition"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}