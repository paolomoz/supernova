import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useUI } from '@/lib/ui-store';
import { useSession } from '@/lib/session-store';
import { PreviewChrome } from './preview-chrome';
import { SplitHandle } from './split-handle';
import { PreviewFrame } from '../preview/preview-frame';
import { ChatPanel } from '../chat/chat-panel';
import { SettingsView } from './settings-view';

// Import session store to activate the message listener
import '@/lib/session-store';

export function PanelShell() {
  const splitRatio = useUI((s) => s.splitRatio);
  const connected = useSession((s) => s.connected);
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return <SettingsView onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Preview section */}
      <div style={{ height: `${splitRatio * 100}%` }} className="flex shrink-0 flex-col">
        <PreviewChrome />
        <div className="flex-1 overflow-hidden">
          <PreviewFrame />
        </div>
      </div>

      <SplitHandle />

      {/* Chat section */}
      <div style={{ height: `${(1 - splitRatio) * 100}%` }} className="flex flex-col overflow-hidden">
        <ChatPanel />
      </div>

      {/* Settings button — fixed bottom-left */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute bottom-3 left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background-layer-2 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        title="Settings"
        aria-label="Open settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {/* Connection indicator */}
      <div className="absolute bottom-3 left-12 z-10 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-positive' : 'bg-muted-foreground'}`} />
        <span className="text-[9px] text-muted-foreground">
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
    </div>
  );
}
