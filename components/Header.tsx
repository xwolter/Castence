// Definiujemy typy dla propsów
interface HeaderProps {
    user: any; // Używamy 'any' dla obiektu użytkownika Firebase, żeby uniknąć błędów typowania
    userRole: string;
    stats: {
        total: number;
        banned: number;
    };
    onLogout: () => void;
    onOpenAdmin: () => void;
}

export default function Header({ user, userRole, stats, onLogout, onOpenAdmin }: HeaderProps) {
    return (
        <header className="border-b border-neutral-800 bg-neutral-950/80 sticky top-0 z-40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <h1 className="text-base font-semibold tracking-tight text-white">Castence</h1>
                    <div className="hidden md:flex gap-6 text-xs text-neutral-500">
                        <div>Baza: <span className="text-neutral-300">{stats.total}</span></div>
                        <div>Ban: <span className="text-neutral-300">{stats.banned}</span></div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {userRole === "admin" && (
                        <button onClick={onOpenAdmin} className="text-xs text-neutral-400 hover:text-white transition">Admin Panel</button>
                    )}
                    <div className="flex items-center gap-4 pl-4 border-l border-neutral-800">
                        {/* Dodano bezpieczne sprawdzanie czy user istnieje (?.) */}
                        <span className="text-xs text-neutral-400 hidden sm:block">{user?.displayName}</span>
                        <button onClick={onLogout} className="text-xs text-neutral-500 hover:text-white">Wyloguj</button>
                    </div>
                </div>
            </div>
        </header>
    );
}