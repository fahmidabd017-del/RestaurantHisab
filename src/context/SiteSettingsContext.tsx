import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SystemSettings } from '../types';
import { updateSystemSettings, getSystemSettings } from '../services/db';
import {
  DEFAULT_SITE_SETTINGS,
  ResolvedSiteSettings,
  mergeSystemSettings,
  formatDocumentTitle,
} from '../utils/siteSettings';

interface SiteSettingsContextValue {
  settings: ResolvedSiteSettings;
  isLoading: boolean;
  updateSiteSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  refreshSiteSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULT_SITE_SETTINGS,
  isLoading: true,
  updateSiteSettings: async () => {},
  refreshSiteSettings: async () => {},
});

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ResolvedSiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const applySettings = useCallback((raw?: Partial<SystemSettings> | null) => {
    const resolved = mergeSystemSettings(raw);
    setSettings(resolved);
    if (typeof document !== 'undefined') {
      document.title = formatDocumentTitle(resolved);
    }
  }, []);

  const refreshSiteSettings = useCallback(async () => {
    try {
      const fetched = await getSystemSettings();
      applySettings(fetched);
    } catch (err) {
      console.warn('Could not refresh site settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'system');
    let unsubscribed = false;

    const unsubscribe = onSnapshot(
      settingsDocRef,
      snap => {
        if (unsubscribed) return;
        if (snap.exists()) {
          applySettings(snap.data() as Partial<SystemSettings>);
        } else {
          applySettings(DEFAULT_SITE_SETTINGS);
        }
        setIsLoading(false);
      },
      () => {
        if (!unsubscribed) {
          refreshSiteSettings();
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, [applySettings, refreshSiteSettings]);

  const updateSiteSettings = useCallback(
    async (updates: Partial<SystemSettings>) => {
      await updateSystemSettings(updates);
      setSettings(prev => {
        const next = mergeSystemSettings({ ...prev, ...updates });
        if (typeof document !== 'undefined') {
          document.title = formatDocumentTitle(next);
        }
        return next;
      });
    },
    []
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSiteSettings,
        refreshSiteSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
};

export function useSiteSettings(): SiteSettingsContextValue {
  return useContext(SiteSettingsContext);
}
