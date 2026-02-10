// Chrome runtime message types

export interface DAPageInfoMessage {
  type: 'DA_PAGE_INFO';
  org: string;
  repo: string;
  path: string;
  url: string;
}

export interface AIChatMessage {
  type: 'AI_CHAT';
  prompt: string;
  context?: {
    org: string;
    repo: string;
    path: string;
  };
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIEventMessage {
  type: 'AI_EVENT';
  event: 'text_delta' | 'tool_use' | 'tool_result' | 'step_start' | 'step_complete' | 'plan_ready' | 'insight' | 'done' | 'error';
  data: Record<string, unknown>;
}

export interface AICancelMessage {
  type: 'AI_CANCEL';
}

export type ServiceWorkerMessage =
  | DAPageInfoMessage
  | AIChatMessage
  | AIEventMessage
  | AICancelMessage
  | { type: 'PING' }
  | { type: 'GET_DA_CONTEXT' }
  | { type: 'HIGHLIGHT_BLOCK'; selector: string }
  | { type: 'GET_PAGE_INFO' };
