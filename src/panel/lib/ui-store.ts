import { create } from 'zustand';

interface UIState {
  splitRatio: number; // 0-1, fraction of height for preview
  setSplitRatio: (ratio: number) => void;
}

export const useUI = create<UIState>((set) => ({
  splitRatio: 0.4,
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.15, Math.min(0.85, ratio)) }),
}));
