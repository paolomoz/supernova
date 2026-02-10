// Chrome runtime message/port helpers for communicating with the service worker

export function sendMessage<T = unknown>(message: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export type PortMessageHandler = (message: Record<string, unknown>) => void;

export function connectPort(name: string, onMessage: PortMessageHandler): chrome.runtime.Port {
  const port = chrome.runtime.connect({ name });
  port.onMessage.addListener(onMessage);
  return port;
}

export function sendToActiveTab(message: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, message, resolve);
      } else {
        resolve(null);
      }
    });
  });
}
