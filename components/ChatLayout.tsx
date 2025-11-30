"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import GlobalChat from "@/components/GlobalChat";

export default function ChatLayout() {
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>("loading");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
                    if (userSnap.exists()) {
                        setUserRole(userSnap.data().role);
                    } else {
                        setUserRole("pending");
                    }
                } catch (e) {
                    console.error("Błąd pobierania roli w czacie", e);
                    setUserRole("pending"); // Dla bezpieczeństwa w razie błędu
                }
            } else {
                setUserRole("loading");
            }
        });
        return () => unsubscribe();
    }, []);

    // 1. Jeśli nie ma usera - nie pokazuj
    if (!user) return null;

    // 2. Jeśli rola się ładuje lub jest 'pending' (niezatwierdzony) - nie pokazuj
    if (userRole === 'loading' || userRole === 'pending') return null;

    // 3. Pokazuj tylko dla admina i membera
    return <GlobalChat user={user} userRole={userRole} />;
}