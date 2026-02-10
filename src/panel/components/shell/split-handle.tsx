import { useCallback, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';
import { useUI } from '@/lib/ui-store';

export function SplitHandle() {
  const setSplitRatio = useUI((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const startRatio = useUI.getState().splitRatio;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const deltaRatio = deltaY / parentRect.height;
        setSplitRatio(startRatio + deltaRatio);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [setSplitRatio],
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="flex h-3 shrink-0 cursor-row-resize items-center justify-center border-y border-border bg-background transition-colors duration-100 hover:bg-accent"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize preview and chat"
    >
      <GripHorizontal className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}
