import { create } from 'zustand';
import { getPreviewUrl } from '../../shared/constants';
import { useSession } from './session-store';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewState {
  deviceMode: DeviceMode;
  cacheBuster: number;
  setDeviceMode: (mode: DeviceMode) => void;
  refresh: () => void;
}

export const usePreview = create<PreviewState>((set) => ({
  deviceMode: 'desktop',
  cacheBuster: Date.now(),

  setDeviceMode: (mode) => set({ deviceMode: mode }),
  refresh: () => set({ cacheBuster: Date.now() }),
}));

export function getPreviewUrlFromSession(): string | null {
  const { org, repo, path, connected } = useSession.getState();
  if (!connected || !org || !repo) return null;
  const pagePath = path.endsWith('.html') ? path.replace(/\.html$/, '') : path;
  return getPreviewUrl(org, repo, pagePath || '/');
}

export const DEVICE_WIDTHS: Record<DeviceMode, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};
