import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  tags?: string[];
}

interface TemplatePickerProps {
  templates: TemplateOption[];
  selected?: string;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({ templates, selected, onSelect }: TemplatePickerProps) {
  return (
    <div className="animate-fade-in-up space-y-2">
      <p className="text-xs font-semibold text-foreground-heading">Choose a template</p>
      <div className="grid grid-cols-2 gap-2">
        {templates.map((template) => {
          const isSelected = selected === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={cn(
                'relative rounded-lg border p-3 text-left transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background-layer-2 hover:border-primary/30 hover:shadow-sm',
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {template.thumbnail && (
                <div className="mb-2 aspect-video overflow-hidden rounded bg-muted">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {!template.thumbnail && (
                <div className="mb-2 flex aspect-video items-center justify-center rounded bg-gradient-to-br from-ai-cyan/20 to-ai-indigo/20">
                  <span className="text-lg font-bold text-ai-indigo/40">
                    {template.name.charAt(0)}
                  </span>
                </div>
              )}

              <p className="text-xs font-medium text-foreground-heading">{template.name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
                {template.description}
              </p>

              {template.tags && template.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
