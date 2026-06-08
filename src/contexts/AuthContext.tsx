import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/config';

interface AppUser {
  uid: string;
  email: string | null;
  role: 'admin' | 'user';
  tenantId: string;
  name?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role || 'user',
              tenantId: data.tenantId || 'guri_padrao',
              name: data.name,
            });
          } else {
            // Profile not found, use fallback
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'admin',
              tenantId: 'guri_padrao',
            });
          }
        } catch (error) {
          console.error("Failed to fetch user profile, using fallback", error);
          // Don't block access on Firestore error — use safe fallback
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'admin',
            tenantId: 'guri_padrao',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
