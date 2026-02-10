import { useRef, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAI } from '@/lib/ai-store';
import { ChatMessage } from './chat-message';
import { AIResponse } from './ai-response';
import { InsightCard } from './insight-card';
import { ChatInput } from './chat-input';
import { PlanRenderer } from './plan-renderer';
import { DiscoveryPrompts } from './discovery-prompts';

export function ChatPanel() {
  const {
    messages, streaming, streamingText, currentStep, currentPlan, completedSteps,
    sendMessage, dismissInsight, handleInsightAction,
  } = useAI();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streamingText, currentStep, completedSteps.length]);

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-3 p-4">
          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl ai-gradient-vivid">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-heading">How can I help?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ask about your content, or try a suggestion below.
                </p>
              </div>
              <div className="w-full mt-2">
                <DiscoveryPrompts onSelect={(prompt) => sendMessage(prompt)} />
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return <ChatMessage key={msg.id} content={msg.content} />;
            }
            if (msg.role === 'assistant') {
              return <AIResponse key={msg.id} content={msg.content} />;
            }
            if (msg.role === 'insight' && msg.insight) {
              return (
                <InsightCard
                  key={msg.id}
                  insight={msg.insight}
                  onAction={handleInsightAction}
                  onDismiss={dismissInsight}
                />
              );
            }
            return null;
          })}

          {/* Streaming plan progress */}
          {streaming && currentPlan && (
            <PlanRenderer
              plan={currentPlan}
              completedSteps={completedSteps}
              currentStep={currentStep}
            />
          )}

          {/* Streaming text */}
          {streaming && streamingText && (
            <AIResponse content={streamingText} streaming />
          )}

          {/* Current step indicator (when no plan) */}
          {streaming && !currentPlan && currentStep && (
            <div className="flex items-center gap-2 animate-fade-in-up rounded-lg bg-background p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="text-xs text-foreground">{currentStep}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput />
    </div>
  );
}
