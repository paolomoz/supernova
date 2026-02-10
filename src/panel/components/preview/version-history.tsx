import { Clock, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Version {
  id: string;
  timestamp: string;
  label?: string;
  user?: string;
}

interface VersionHistoryProps {
  versions: Version[];
  currentId?: string;
  onSelect: (versionId: string) => void;
}

export function VersionHistory({ versions, currentId, onSelect }: VersionHistoryProps) {
  const [open, setOpen] = useState(false);

  if (versions.length === 0) return null;

  const current = versions.find((v) => v.id === currentId) || versions[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Clock className="h-3 w-3" />
        <span>{current.label || formatTimestamp(current.timestamp)}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-lg border border-border bg-background-layer-2 shadow-elevated">
          <div className="max-h-48 overflow-y-auto py-1">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => { onSelect(v.id); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors',
                  v.id === currentId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent',
                )}
              >
                <span className="truncate">{v.label || formatTimestamp(v.timestamp)}</span>
                {v.user && <span className="text-muted-foreground truncate">{v.user}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}
