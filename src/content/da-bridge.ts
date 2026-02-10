// DA Bridge — Content script injected into da.live
// Observes URL changes and communicates DA context to the service worker

interface DAPageInfo {
  type: 'DA_PAGE_INFO';
  org: string;
  repo: string;
  path: string;
  url: string;
}

function parseDAUrl(): DAPageInfo | null {
  // DA URLs: https://da.live/edit#/{org}/{repo}/{path}
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#/')) return null;

  const parts = hash.slice(2).split('/'); // Remove '#/'
  if (parts.length < 2) return null;

  const org = parts[0];
  const repo = parts[1];
  const path = '/' + parts.slice(2).join('/');

  return {
    type: 'DA_PAGE_INFO',
    org,
    repo,
    path: path || '/',
    url: window.location.href,
  };
}

function sendPageInfo() {
  const info = parseDAUrl();
  if (info) {
    chrome.runtime.sendMessage(info).catch(() => {
      // Service worker may not be ready yet
    });
  }
}

// Send on load
sendPageInfo();

// Watch for hash changes (DA uses hash-based routing)
window.addEventListener('hashchange', sendPageInfo);

// Listen for commands from the side panel / service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'HIGHLIGHT_BLOCK': {
      // Phase 6: highlight a block in the DA editor
      const el = document.querySelector(message.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).style.outline = '2px solid #3B63FB';
        (el as HTMLElement).style.outlineOffset = '2px';
        setTimeout(() => {
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.outlineOffset = '';
        }, 3000);
      }
      sendResponse({ ok: true });
      break;
    }
    case 'GET_PAGE_INFO': {
      const info = parseDAUrl();
      sendResponse(info || { type: 'DA_PAGE_INFO', org: '', repo: '', path: '', url: '' });
      break;
    }
    default:
      sendResponse({ ok: false });
  }
  return true;
});

console.log('[Supernova] DA bridge loaded');
