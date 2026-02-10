import { Sparkles, FileText, Palette, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryPromptsProps {
  onSelect: (prompt: string) => void;
}

const categories = [
  {
    label: 'Create',
    icon: Sparkles,
    prompts: [
      'Create a landing page for a product launch',
      'Build a hero section with a headline and CTA',
      'Create a features section with 3 columns',
    ],
  },
  {
    label: 'Edit',
    icon: FileText,
    prompts: [
      'Rewrite the hero headline to be more engaging',
      'Add an FAQ section below the features',
      'Update the copy to match our brand voice',
    ],
  },
  {
    label: 'Design',
    icon: Palette,
    prompts: [
      'Suggest improvements for this page layout',
      'Create an A/B variation with a different hero',
      'Make the page more visually engaging',
    ],
  },
  {
    label: 'Optimize',
    icon: Globe,
    prompts: [
      'Review this page for SEO best practices',
      'Culturalize this page for the Japanese market',
      'Check the page for accessibility issues',
    ],
  },
];

export function DiscoveryPrompts({ onSelect }: DiscoveryPromptsProps) {
  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <div key={category.label}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category.label}
              </span>
            </div>
            <div className="space-y-1">
              {category.prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSelect(prompt)}
                  className={cn(
                    'w-full rounded-md border border-border bg-background-layer-2 px-2.5 py-1.5 text-left text-xs text-foreground',
                    'transition-colors duration-100 hover:bg-accent hover:border-primary/30',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
