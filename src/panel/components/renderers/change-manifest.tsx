import { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChangeItem {
  id: string;
  description: string;
  type: 'add' | 'modify' | 'remove';
  detail?: string;
  accepted: boolean;
}

interface ChangeManifestProps {
  changes: ChangeItem[];
  onToggle: (id: string) => void;
  onApply: (acceptedIds: string[]) => void;
}

const typeConfig = {
  add: { label: 'Add', color: 'text-positive', bg: 'bg-positive/10' },
  modify: { label: 'Change', color: 'text-primary', bg: 'bg-primary/10' },
  remove: { label: 'Remove', color: 'text-destructive', bg: 'bg-destructive/10' },
};

export function ChangeManifest({ changes, onToggle, onApply }: ChangeManifestProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const accepted = changes.filter((c) => c.accepted);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="animate-fade-in-up space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground-heading">Review Changes</p>
        <span className="text-[10px] text-muted-foreground">
          {accepted.length}/{changes.length} accepted
        </span>
      </div>

      <div className="space-y-1">
        {changes.map((change) => {
          const config = typeConfig[change.type];
          const isExpanded = expanded.has(change.id);

          return (
            <div key={change.id} className="rounded-md border border-border bg-background-layer-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                {/* Toggle */}
                <button
                  onClick={() => onToggle(change.id)}
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-100',
                    change.accepted
                      ? 'border-primary bg-primary'
                      : 'border-border hover:border-muted-foreground',
                  )}
                  aria-label={change.accepted ? 'Decline change' : 'Accept change'}
                >
                  {change.accepted && <Check className="h-2.5 w-2.5 text-white" />}
                </button>

                {/* Type badge */}
                <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium', config.bg, config.color)}>
                  {config.label}
                </span>

                {/* Description */}
                <span className="flex-1 text-xs text-foreground truncate">{change.description}</span>

                {/* Expand */}
                {change.detail && (
                  <button
                    onClick={() => toggleExpand(change.id)}
                    className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {isExpanded && change.detail && (
                <div className="border-t border-border px-2.5 py-2 text-[10px] text-muted-foreground">
                  {change.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApply(accepted.map((c) => c.id))}
          disabled={accepted.length === 0}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-30 hover:bg-primary/90"
        >
          Apply {accepted.length} change{accepted.length !== 1 ? 's' : ''}
        </button>
        <button
          onClick={() => changes.forEach((c) => !c.accepted && onToggle(c.id))}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
