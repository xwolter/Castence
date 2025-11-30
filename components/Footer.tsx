import { Heart, Code, ShieldCheck } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full -mt-48 border-t border-neutral-900 bg-[#050505] py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-neutral-600">

                {/* LEWA STRONA: COPYRIGHT */}
                <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-500">Castence</span>
                    <span>&copy; {currentYear}</span>
                </div>

                {/* PRAWA STRONA: CREDITS */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Code className="w-3 h-3" />
                        <span>Dev: <span className="text-neutral-400 hover:text-white transition cursor-pointer">Wolter</span></span>
                    </div>

                    <div className="w-px h-3 bg-neutral-800"></div>

                    <div className="flex items-center gap-1.5 group">
                        <span>Made with</span>
                        <Heart className="w-3 h-3 text-red-900 fill-red-900 group-hover:text-red-600 group-hover:fill-red-600 transition-colors duration-300" />
                    </div>

                    <div className="w-px h-3 bg-neutral-800"></div>

                    <span className="font-mono opacity-50">v2.2</span>
                </div>
            </div>
        </footer>
    );
}