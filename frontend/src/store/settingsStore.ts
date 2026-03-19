import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, AISettings } from '../types';

interface SettingsState extends AppSettings {
  updateAISettings: (ai: Partial<AISettings>) => void;
  updateTheme: (theme: 'dark' | 'light') => void;
  updateFeedWindow: (hours: number) => void;
  updateRefreshInterval: (minutes: number) => void;
  setCustomKeywords: (keywords: string[]) => void;
  setCustomPromptAnalysis: (prompt: string) => void;
  setCustomPromptSummary: (prompt: string) => void;
}

function applyTheme(theme: 'dark' | 'light'): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
}

const defaultSettings: AppSettings = {
  ai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: '',
  },
  feedWindowHours: 24,
  refreshIntervalMinutes: 30,
  theme: 'dark',
  customKeywords: [],
  customPromptAnalysis: '',
  customPromptSummary: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateAISettings: (ai) =>
        set((state) => ({
          ai: { ...state.ai, ...ai },
        })),

      updateTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },

      updateFeedWindow: (feedWindowHours) => set({ feedWindowHours }),

      updateRefreshInterval: (refreshIntervalMinutes) => set({ refreshIntervalMinutes }),

      setCustomKeywords: (customKeywords) => set({ customKeywords }),

      setCustomPromptAnalysis: (customPromptAnalysis) => set({ customPromptAnalysis }),

      setCustomPromptSummary: (customPromptSummary) => set({ customPromptSummary }),
    }),
    {
      name: 'feedwatch-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
