// Supernova Service Worker — Extension backend
// Handles message routing between content script, side panel, and AI

import { streamChat, continueWithToolResult, type StreamCallbacks } from './ai-client';
import { getToolDefinitions } from './ai-tools';
import { executeTool } from './ai-tool-executor';

// Build-time env defaults injected by Vite
declare const __ENV_DEFAULTS__: Record<string, string>;

// Track the current DA page info per tab
const tabPageInfo = new Map<number, { org: string; repo: string; path: string }>();

// Track active AI streams for cancellation
const activeStreams = new Map<string, AbortController>();

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Supernova] Extension installed');

  // Seed chrome.storage with .env defaults (only set values not already configured)
  try {
    const existing = await chrome.storage.local.get(null);
    const defaults: Record<string, string> = {};

    const envMap: Record<string, string> = typeof __ENV_DEFAULTS__ !== 'undefined' ? __ENV_DEFAULTS__ : {};

    if (envMap.ANTHROPIC_API_KEY && !existing.ANTHROPIC_API_KEY) {
      defaults.ANTHROPIC_API_KEY = envMap.ANTHROPIC_API_KEY;
    }
    if (envMap.BEDROCK_TOKEN && !existing.BEDROCK_TOKEN) {
      defaults.BEDROCK_TOKEN = envMap.BEDROCK_TOKEN;
    }
    if (envMap.USE_BEDROCK && !existing.USE_BEDROCK) {
      defaults.USE_BEDROCK = envMap.USE_BEDROCK;
    }
    if (envMap.AWS_REGION && !existing.AWS_REGION) {
      defaults.AWS_REGION = envMap.AWS_REGION;
    }
    if (envMap.DA_CLIENT_ID && !existing.DA_CLIENT_ID) {
      defaults.DA_CLIENT_ID = envMap.DA_CLIENT_ID;
    }
    if (envMap.DA_CLIENT_SECRET && !existing.DA_CLIENT_SECRET) {
      defaults.DA_CLIENT_SECRET = envMap.DA_CLIENT_SECRET;
    }
    if (envMap.DA_SERVICE_TOKEN && !existing.DA_SERVICE_TOKEN) {
      defaults.DA_SERVICE_TOKEN = envMap.DA_SERVICE_TOKEN;
    }

    if (Object.keys(defaults).length > 0) {
      await chrome.storage.local.set(defaults);
      console.log('[Supernova] Seeded storage with env defaults:', Object.keys(defaults));
    }
  } catch (e) {
    console.warn('[Supernova] Failed to seed storage defaults:', e);
  }
});

// Open side panel when the extension action icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// Message routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'DA_PAGE_INFO': {
      const tabId = sender.tab?.id;
      if (tabId) {
        tabPageInfo.set(tabId, { org: message.org, repo: message.repo, path: message.path });
      }
      chrome.runtime.sendMessage(message).catch(() => {});
      sendResponse({ ok: true });
      break;
    }

    case 'GET_DA_CONTEXT': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId && tabPageInfo.has(tabId)) {
          sendResponse(tabPageInfo.get(tabId));
        } else {
          sendResponse(null);
        }
      });
      return true;
    }

    case 'SET_API_KEY': {
      chrome.storage.local.set({ ANTHROPIC_API_KEY: message.key });
      sendResponse({ ok: true });
      break;
    }

    case 'SET_DA_CREDENTIALS': {
      chrome.storage.local.set({
        DA_CLIENT_ID: message.clientId,
        DA_CLIENT_SECRET: message.clientSecret,
        DA_SERVICE_TOKEN: message.serviceToken,
      });
      sendResponse({ ok: true });
      break;
    }

    case 'PING':
      sendResponse({ ok: true, ts: Date.now() });
      break;

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
  }

  return true;
});

// Clean up tab info when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabPageInfo.delete(tabId);
});

// Port connections for AI streaming
chrome.runtime.onConnect.addListener((port) => {
  const portId = `${port.name}-${Date.now()}`;
  let abortController: AbortController | null = null;

  port.onMessage.addListener(async (message) => {
    if (message.type === 'AI_CANCEL') {
      abortController?.abort();
      activeStreams.delete(portId);
      return;
    }

    if (message.type === 'AI_CHAT') {
      abortController = new AbortController();
      activeStreams.set(portId, abortController);

      const { prompt, context, history = [] } = message as {
        prompt: string;
        context?: { org: string; repo: string; path: string };
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      const tools = getToolDefinitions();

      const callbacks: StreamCallbacks = {
        onTextDelta: (text) => {
          try { port.postMessage({ type: 'AI_EVENT', event: 'text_delta', data: { text } }); } catch { /* port closed */ }
        },
        onToolUse: async (id, name, input) => {
          try {
            port.postMessage({
              type: 'AI_EVENT',
              event: 'step_start',
              data: { description: `Running ${name}...` },
            });
          } catch { /* port closed */ }

          // Execute the tool
          const result = await executeTool(name, input, context);

          try {
            port.postMessage({
              type: 'AI_EVENT',
              event: 'step_complete',
              data: {
                stepId: id,
                status: result.startsWith('Error') ? 'error' : 'success',
                description: name,
                toolName: name,
                result,
              },
            });
          } catch { /* port closed */ }

          // If the page was created/modified, tell the panel to refresh preview
          if (['create_page', 'delete_page', 'copy_page', 'move_page'].includes(name)) {
            try {
              port.postMessage({
                type: 'AI_EVENT',
                event: 'preview_refresh',
                data: {},
              });
            } catch { /* port closed */ }
          }

          // Continue the conversation with the tool result
          const updatedHistory = [
            ...history.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user' as const, content: prompt },
            {
              role: 'assistant' as const,
              content: [
                { type: 'tool_use', id, name, input },
              ],
            },
          ];

          // Continue with the tool result
          await continueWithToolResult(
            updatedHistory as Array<{ role: 'user' | 'assistant'; content: string }>,
            id,
            result,
            tools,
            callbacks,
            context,
            abortController?.signal,
          );
        },
        onDone: (response, _stopReason) => {
          activeStreams.delete(portId);
          try {
            port.postMessage({
              type: 'AI_EVENT',
              event: 'done',
              data: { response },
            });
          } catch { /* port closed */ }
        },
        onError: (error) => {
          activeStreams.delete(portId);
          try {
            port.postMessage({
              type: 'AI_EVENT',
              event: 'error',
              data: { error },
            });
          } catch { /* port closed */ }
        },
      };

      await streamChat(
        prompt,
        history,
        tools,
        callbacks,
        context,
        abortController.signal,
      );
    }
  });

  port.onDisconnect.addListener(() => {
    abortController?.abort();
    activeStreams.delete(portId);
  });
});

console.log('[Supernova] Service worker ready');
