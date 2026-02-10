export interface InsightCard {
  id: string;
  message: string;
  type: 'suggestion' | 'warning' | 'info';
  actions: Array<{ label: string; action: string }>;
  dismissed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'insight';
  content: string;
  timestamp: number;
  insight?: InsightCard;
}

export interface PlanInfo {
  intent: string;
  stepCount: number;
  steps?: Array<{ id: string; description: string; toolName?: string }>;
}

export interface CompletedStep {
  stepId: string;
  status: 'success' | 'error';
  description?: string;
  toolName?: string;
  result?: string;
  error?: string;
}
