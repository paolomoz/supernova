import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Variation {
  id: string;
  label: string;
  path: string;
}

interface VariationTabsProps {
  variations: Variation[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function VariationTabs({ variations, activeId, onSelect, onAdd }: VariationTabsProps) {
  if (variations.length <= 1) return null;

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-3 py-1">
      {variations.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v.id)}
          className={cn(
            'rounded-t-md px-2.5 py-1 text-[10px] font-medium transition-colors duration-100',
            activeId === v.id
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          {v.label}
        </button>
      ))}
      <button
        onClick={onAdd}
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Create variation"
        aria-label="Create new variation"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
