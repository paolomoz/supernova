import { cn } from '@/lib/utils';

interface AIResponseProps {
  content: string;
  streaming?: boolean;
}

export function AIResponse({ content, streaming }: AIResponseProps) {
  if (!content && !streaming) return null;

  return (
    <div className="animate-fade-in-up">
      <div className={cn('rounded-lg bg-background px-3 py-2 text-sm leading-relaxed text-foreground')}>
        {content.split('\n').map((line, i) => {
          if (!line.trim()) return <br key={i} />;

          // Bold text
          let formatted: React.ReactNode = line;
          if (line.includes('**')) {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            formatted = parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            );
          }

          // Inline code
          if (typeof formatted === 'string' && formatted.includes('`')) {
            const parts = formatted.split(/`(.*?)`/g);
            formatted = parts.map((part, j) =>
              j % 2 === 1 ? (
                <code key={j} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  {part}
                </code>
              ) : (
                part
              )
            );
          }

          // Headings
          if (line.startsWith('### ')) {
            return (
              <h4 key={i} className="mt-3 mb-1 text-xs font-bold text-foreground-heading">
                {line.slice(4)}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="mt-3 mb-1 text-sm font-bold text-foreground-heading">
                {line.slice(3)}
              </h3>
            );
          }

          // List items
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex gap-1.5 pl-1">
                <span className="text-muted-foreground">-</span>
                <span>{typeof formatted === 'string' ? formatted.slice(2) : formatted}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s/);
          if (numMatch) {
            return (
              <div key={i} className="flex gap-1.5 pl-1">
                <span className="text-muted-foreground">{numMatch[1]}.</span>
                <span>{line.slice(numMatch[0].length)}</span>
              </div>
            );
          }

          return <p key={i}>{formatted}</p>;
        })}
        {streaming && (
          <span className="inline-block h-4 w-1.5 animate-pulse bg-primary/60 ml-0.5" />
        )}
      </div>
    </div>
  );
}
