import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanInfo, CompletedStep } from '@/types/ai';

interface PlanRendererProps {
  plan: PlanInfo;
  completedSteps: CompletedStep[];
  currentStep: string | null;
}

export function PlanRenderer({ plan, completedSteps, currentStep }: PlanRendererProps) {
  return (
    <div className="animate-fade-in-up rounded-lg bg-background p-3 text-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground-heading text-xs">
          {plan.intent}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {completedSteps.length}/{plan.stepCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(completedSteps.length / plan.stepCount) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {completedSteps.map((step) => (
          <div key={step.stepId} className="flex items-start gap-1.5 text-xs">
            {step.status === 'success' ? (
              <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-positive/10">
                <Check className="h-2 w-2 text-positive" />
              </div>
            ) : (
              <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <X className="h-2 w-2 text-destructive" />
              </div>
            )}
            <span className={cn(
              'leading-relaxed',
              step.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {step.description || step.toolName || step.stepId}
            </span>
          </div>
        ))}
        {currentStep && (
          <div className="flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-foreground">{currentStep}</span>
          </div>
        )}
      </div>
    </div>
  );
}
