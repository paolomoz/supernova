import { create } from 'zustand';

interface SessionState {
  org: string;
  repo: string;
  path: string;
  connected: boolean;
  setPageInfo: (org: string, repo: string, path: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useSession = create<SessionState>((set) => ({
  org: '',
  repo: '',
  path: '',
  connected: false,

  setPageInfo: (org, repo, path) => set({ org, repo, path, connected: true }),
  setConnected: (connected) => set({ connected }),
}));

// Listen for DA_PAGE_INFO messages from the service worker / content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DA_PAGE_INFO' && message.org) {
    useSession.getState().setPageInfo(message.org, message.repo, message.path);
  }
});

// On panel open, query the active tab for current page info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0]?.id;
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, (response) => {
      if (chrome.runtime.lastError) return; // Content script not loaded
      if (response?.org) {
        useSession.getState().setPageInfo(response.org, response.repo, response.path);
      }
    });
  }
});
