import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './firestore-error';

export type Role = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentClass?: string;
  studentStream?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      } catch (e) {
        console.warn('Failed to fetch profile:', e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email || '',
          name: result.user.displayName || 'Admin',
          role: 'teacher',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await fetchProfile(result.user.uid);
      }
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      alert('Gagal log masuk: ' + error.message);
      throw error;
    }
  };

  const signInWithPassword = async (password: string) => {
    if (password !== 'skauk0053') {
      throw new Error('Kata laluan salah.');
    }
    
    try {
      const result = await signInAnonymously(auth);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: 'admin@skauk.edu.my',
          name: 'Admin SKAUK',
          role: 'teacher',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await fetchProfile(result.user.uid);
      }
    } catch (error: any) {
      console.error('Error signing in anonymously', error);
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Pengesahan tanpa nama (Anonymous Auth) tidak diaktifkan. Sila aktifkan di Firebase Console.');
      } else {
        throw new Error('Gagal log masuk: ' + error.message);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithPassword, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
