import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import type { Restaurant } from '../types';
import { getRestaurantByEmail, getRestaurantById, getSystemSettings } from '../services/db';
import { hashString, verifyHash } from '../utils/crypto';

interface AuthContextType {
  restaurant: Restaurant | null;
  firebaseUser: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  loginRestaurant: (email: string, password: string) => Promise<Restaurant>;
  loginWithGoogle: () => Promise<{ success: boolean; restaurant?: Restaurant; googleUser?: User }>;
  logoutRestaurant: () => Promise<void>;
  loginAdmin: (password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  refreshRestaurant: () => Promise<void>;
  setRestaurantDirect: (rest: Restaurant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure cryptographic SHA-256 hash of the Super Admin password
const DEFAULT_ADMIN_HASH = '32b0b1541a0f7c64f73474cf266f5743757b5b0b3ea23d98b9cd0cd6f4b70a3e';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('restauranthisab_admin_auth') === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore restaurant session & real-time sync with database
  useEffect(() => {
    let unsubscribeRestDoc: (() => void) | null = null;
    const savedRestId = localStorage.getItem('restauranthisab_restaurant_id');

    if (savedRestId) {
      try {
        const restDocRef = doc(db, 'restaurants', savedRestId);
        unsubscribeRestDoc = onSnapshot(restDocRef, snap => {
          if (snap.exists()) {
            setRestaurant(snap.data() as Restaurant);
          } else {
            setRestaurant(null);
            localStorage.removeItem('restauranthisab_restaurant_id');
          }
          setIsLoading(false);
        }, err => {
          console.warn('Real-time restaurant snapshot error:', err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Session listener error:', err);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    // Listen to Firebase auth
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setFirebaseUser(user);
      if (user && user.email) {
        // If logged in via Google and no restaurant loaded yet, try to auto-match restaurant
        const savedId = localStorage.getItem('restauranthisab_restaurant_id');
        if (!savedId) {
          try {
            const matched = await getRestaurantByEmail(user.email);
            if (matched) {
              setRestaurant(matched);
              localStorage.setItem('restauranthisab_restaurant_id', matched.id);
            }
          } catch (e) {
            console.warn('Auto match error:', e);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeRestDoc) unsubscribeRestDoc();
    };
  }, []);

  const loginRestaurant = async (email: string, password: string): Promise<Restaurant> => {
    const existing = await getRestaurantByEmail(email);
    if (!existing) {
      throw new Error('এই ইমেইল দিয়ে কোনো রেস্তোরাঁ পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইমেইল দিন।');
    }

    const isValid = await verifyHash(password, existing.passwordHash);
    if (!isValid) {
      throw new Error('ভুল পাসওয়ার্ড! অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }

    setRestaurant(existing);
    localStorage.setItem('restauranthisab_restaurant_id', existing.id);
    return existing;
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      if (user && user.email) {
        const existing = await getRestaurantByEmail(user.email);
        if (existing) {
          setRestaurant(existing);
          localStorage.setItem('restauranthisab_restaurant_id', existing.id);
          return { success: true, restaurant: existing, googleUser: user };
        }
        return { success: true, restaurant: undefined, googleUser: user };
      }
      return { success: false };
    } catch (err) {
      console.error('Google sign in error:', err);
      throw err;
    }
  };

  const logoutRestaurant = async () => {
    setRestaurant(null);
    localStorage.removeItem('restauranthisab_restaurant_id');
    try {
      await signOut(auth);
    } catch (e) {
      // non-fatal
    }
  };

  const loginAdmin = async (password: string): Promise<boolean> => {
    localStorage.removeItem('restauranthisab_admin_hash');
    const customHash = localStorage.getItem('restauranthisab_admin_hash_v2');
    const dbSettings = customHash ? null : await getSystemSettings().catch(() => null);
    const targetHash = customHash || dbSettings?.adminPasswordHash || DEFAULT_ADMIN_HASH;

    // Cryptographic hash verification only - no plain text stored in code
    const computedHash = await hashString(password);
    const isHashMatch = computedHash === targetHash;

    if (isHashMatch) {
      setIsAdmin(true);
      sessionStorage.setItem('restauranthisab_admin_auth', 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('restauranthisab_admin_auth');
  };

  const refreshRestaurant = async () => {
    if (restaurant) {
      const updated = await getRestaurantById(restaurant.id);
      if (updated) {
        setRestaurant(updated);
      }
    }
  };

  const setRestaurantDirect = (rest: Restaurant | null) => {
    setRestaurant(rest);
    if (rest) {
      localStorage.setItem('restauranthisab_restaurant_id', rest.id);
    } else {
      localStorage.removeItem('restauranthisab_restaurant_id');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        restaurant,
        firebaseUser,
        isAdmin,
        isLoading,
        loginRestaurant,
        loginWithGoogle,
        logoutRestaurant,
        loginAdmin,
        logoutAdmin,
        refreshRestaurant,
        setRestaurantDirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
