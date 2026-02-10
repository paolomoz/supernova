import { create } from 'zustand';
import type { ChatMessage, InsightCard, PlanInfo, CompletedStep } from '@/types/ai';
import { usePreview } from './preview-store';

interface AIState {
  streaming: boolean;
  messages: ChatMessage[];
  insights: InsightCard[];
  currentPlan: PlanInfo | null;
  currentStep: string | null;
  completedSteps: CompletedStep[];
  streamingText: string;
  port: chrome.runtime.Port | null;

  sendMessage: (prompt: string, context?: { org: string; repo: string; path: string }) => void;
  cancelStream: () => void;
  addInsight: (insight: Omit<InsightCard, 'id'>) => void;
  dismissInsight: (id: string) => void;
  handleInsightAction: (insightId: string, action: string) => void;
  clearMessages: () => void;
}

let insightCounter = 0;

export const useAI = create<AIState>((set, get) => ({
  streaming: false,
  messages: [],
  insights: [],
  currentPlan: null,
  currentStep: null,
  completedSteps: [],
  streamingText: '',
  port: null,

  sendMessage: (prompt, context) => {
    const state = get();
    if (state.streaming) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    set({
      streaming: true,
      streamingText: '',
      currentPlan: null,
      currentStep: 'Thinking...',
      completedSteps: [],
      messages: [...state.messages, userMsg],
    });

    // Build conversation history for context
    const history = [...state.messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Connect via port for streaming
    const port = chrome.runtime.connect({ name: 'ai-stream' });
    set({ port });

    port.onMessage.addListener((message) => {
      if (message.type !== 'AI_EVENT') return;

      const { event, data } = message as { type: string; event: string; data: Record<string, unknown> };

      switch (event) {
        case 'text_delta': {
          set((s) => ({ streamingText: s.streamingText + (data.text as string) }));
          break;
        }
        case 'plan_ready': {
          const plan = data as unknown as PlanInfo;
          set({ currentPlan: plan, currentStep: null });
          break;
        }
        case 'step_start': {
          set({ currentStep: data.description as string });
          break;
        }
        case 'step_complete': {
          const step = data as unknown as CompletedStep;
          set((s) => ({
            completedSteps: [...s.completedSteps, step],
            currentStep: null,
          }));
          break;
        }
        case 'preview_refresh': {
          usePreview.getState().refresh();
          break;
        }
        case 'insight': {
          const insightData = data as { message: string; type?: string; actions?: Array<{ label: string; action: string }> };
          get().addInsight({
            message: insightData.message,
            type: (insightData.type as InsightCard['type']) || 'suggestion',
            actions: insightData.actions || [
              { label: 'Accept', action: 'accept' },
              { label: 'Dismiss', action: 'dismiss' },
            ],
          });
          break;
        }
        case 'done': {
          const response = (data.response as string) || get().streamingText;
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
          };
          set((s) => ({
            streaming: false,
            streamingText: '',
            currentStep: null,
            port: null,
            messages: [...s.messages, assistantMsg],
          }));
          port.disconnect();
          break;
        }
        case 'error': {
          const errorText = data.error as string;
          const errorMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${errorText}`,
            timestamp: Date.now(),
          };
          set((s) => ({
            streaming: false,
            streamingText: '',
            currentStep: null,
            port: null,
            messages: [...s.messages, errorMsg],
          }));
          port.disconnect();
          break;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      set({ streaming: false, port: null });
    });

    // Send the chat request
    port.postMessage({
      type: 'AI_CHAT',
      prompt,
      context,
      history,
    });
  },

  cancelStream: () => {
    const { port } = get();
    if (port) {
      port.postMessage({ type: 'AI_CANCEL' });
      port.disconnect();
    }
    set({ streaming: false, streamingText: '', currentStep: null, port: null });
  },

  addInsight: (insight) => {
    const id = `insight-${++insightCounter}`;
    const card: InsightCard = { ...insight, id };
    set((state) => ({
      insights: [...state.insights, card],
      messages: [
        ...state.messages,
        { id, role: 'insight' as const, content: insight.message, timestamp: Date.now(), insight: card },
      ],
    }));
  },

  dismissInsight: (id) => {
    set((state) => ({
      insights: state.insights.map((i) => (i.id === id ? { ...i, dismissed: true } : i)),
    }));
  },

  handleInsightAction: (insightId, action) => {
    if (action === 'dismiss') {
      get().dismissInsight(insightId);
      return;
    }
    if (action === 'accept') {
      // Find the insight and send its message as a prompt
      const insight = get().insights.find((i) => i.id === insightId);
      if (insight) {
        get().sendMessage(insight.message);
      }
    }
    get().dismissInsight(insightId);
  },

  clearMessages: () => {
    set({ messages: [], insights: [], currentPlan: null, completedSteps: [], streamingText: '' });
  },
}));
