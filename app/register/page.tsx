"use client";
import { useState } from "react";
import { auth, createUserWithEmailAndPassword, updateProfile } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const [nick, setNick] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if(nick.length < 3) return setError("Nick musi mieć min. 3 znaki.");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: nick,
                photoURL: `https://ui-avatars.com/api/?name=${nick}&background=random`
            });

            router.push("/");
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError("Ten email jest już zajęty.");
            else if (err.code === 'auth/weak-password') setError("Hasło jest za słabe (min. 6 znaków).");
            else setError("Wystąpił błąd rejestracji.");
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Utwórz konto</h1>
                    <p className="text-neutral-500 text-sm mt-2">Dołącz do Castence Panel</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded text-center">{error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Twój Nick</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:border-neutral-600 outline-none"
                            placeholder="Np. Admin123"
                            value={nick}
                            onChange={(e) => setNick(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:border-neutral-600 outline-none"
                            placeholder="adres@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Hasło</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-sm focus:border-neutral-600 outline-none"
                            placeholder="Min. 6 znaków"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-sm shadow-lg shadow-emerald-900/20">
                        Zarejestruj się
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-neutral-500">
                    Masz już konto? <Link href="/login" className="text-white hover:underline">Zaloguj się</Link>
                </p>
            </div>
        </div>
    );
}