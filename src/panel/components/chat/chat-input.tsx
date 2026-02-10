import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAI } from '@/lib/ai-store';
import { useSession } from '@/lib/session-store';

export function ChatInput() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { streaming, sendMessage, cancelStream } = useAI();
  const { org, repo, path, connected } = useSession();

  const handleSubmit = useCallback(() => {
    if (!input.trim() || streaming) return;
    const context = connected ? { org, repo, path } : undefined;
    sendMessage(input.trim(), context);
    setInput('');
  }, [input, streaming, connected, org, repo, path, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && streaming) {
      cancelStream();
    }
  };

  return (
    <div className="border-t border-border p-3 space-y-2">
      <div className="flex items-end gap-2 rounded-lg border border-border bg-background p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Supernova..."
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            'min-h-[24px] max-h-[120px]',
          )}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        {streaming ? (
          <button
            onClick={cancelStream}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors duration-100 hover:bg-destructive/20"
            title="Stop"
            aria-label="Stop streaming"
          >
            <Square className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity duration-100 disabled:opacity-30"
            title="Send"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-end">
        <span className="text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">Shift+Enter</kbd> for newline
        </span>
      </div>
    </div>
  );
}
