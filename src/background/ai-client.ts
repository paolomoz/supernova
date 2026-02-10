// Anthropic Messages API client with SSE streaming
// Runs in service worker — sends events back via chrome.runtime port

import { ANTHROPIC_API_URL, ANTHROPIC_MODEL } from '../shared/constants';

interface ChatContext {
  org: string;
  repo: string;
  path: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolUse: (id: string, name: string, input: Record<string, unknown>) => void;
  onDone: (response: string, stopReason: string) => void;
  onError: (error: string) => void;
}

async function getApiKey(): Promise<string> {
  const data = await chrome.storage.local.get('ANTHROPIC_API_KEY');
  return data.ANTHROPIC_API_KEY || '';
}

export async function setApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ ANTHROPIC_API_KEY: key });
}

function buildSystemPrompt(context?: ChatContext): string {
  const base = `You are Supernova, an AI-powered assistant for Adobe Experience Manager (AEM) Document Authoring.

You help users build, edit, and manage web pages through conversation. You have access to tools that can create, read, update, and delete pages in the DA (Document Authoring) environment.

When creating pages, use EDS (Edge Delivery Services) block markup:
- A block is: <div class="block-name"><div>...rows...</div></div>
- Each row is a direct child <div> of the block. Each cell is a direct child <div> of a row.
- Columns: ONE row with N cells (not N rows with 1 cell)
- Cards: N rows, each row is one card with cells (e.g. image cell + text cell)
- Hero: 1 row with image cell + text cell
- Images use <picture><img src="..." alt="..."></picture>
- Section breaks: <hr>

Be concise, helpful, and proactive. When you create or modify pages, explain what you did briefly. When you see opportunities to improve the page, suggest them as insights.`;

  if (context?.org && context?.repo) {
    return `${base}\n\nCurrent DA context: org="${context.org}", repo="${context.repo}", path="${context.path}".`;
  }
  return base;
}

export async function streamChat(
  prompt: string,
  history: AIMessage[],
  tools: ToolDefinition[],
  callbacks: StreamCallbacks,
  context?: ChatContext,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    callbacks.onError('Anthropic API key not configured. Go to Settings to add your key.');
    return;
  }

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: prompt },
  ];

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    stream: true,
    system: buildSystemPrompt(context),
    messages,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(`API error ${response.status}: ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let stopReason = 'end_turn';
    let currentToolId = '';
    let currentToolName = '';
    let currentToolInput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          switch (event.type) {
            case 'content_block_start': {
              if (event.content_block?.type === 'tool_use') {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInput = '';
              }
              break;
            }
            case 'content_block_delta': {
              if (event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                fullText += text;
                callbacks.onTextDelta(text);
              } else if (event.delta?.type === 'input_json_delta') {
                currentToolInput += event.delta.partial_json;
              }
              break;
            }
            case 'content_block_stop': {
              if (currentToolName) {
                let input: Record<string, unknown> = {};
                try {
                  input = JSON.parse(currentToolInput);
                } catch {
                  // Malformed tool input
                }
                callbacks.onToolUse(currentToolId, currentToolName, input);
                currentToolName = '';
                currentToolInput = '';
              }
              break;
            }
            case 'message_delta': {
              if (event.delta?.stop_reason) {
                stopReason = event.delta.stop_reason;
              }
              break;
            }
            case 'message_stop': {
              callbacks.onDone(fullText, stopReason);
              return;
            }
            case 'error': {
              callbacks.onError(event.error?.message || 'Stream error');
              return;
            }
          }
        } catch {
          // Ignore malformed SSE data
        }
      }
    }

    // If we exit the loop without message_stop, still call done
    callbacks.onDone(fullText, stopReason);
  } catch (error) {
    if (signal?.aborted) return;
    callbacks.onError((error as Error).message);
  }
}

export async function continueWithToolResult(
  history: AIMessage[],
  toolUseId: string,
  toolResult: string,
  tools: ToolDefinition[],
  callbacks: StreamCallbacks,
  context?: ChatContext,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    callbacks.onError('Anthropic API key not configured.');
    return;
  }

  // Build messages with the tool result
  const messages = [
    ...history,
    {
      role: 'user' as const,
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: toolResult,
        },
      ],
    },
  ];

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    stream: true,
    system: buildSystemPrompt(context),
    messages,
    tools,
  };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(`API error ${response.status}: ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let stopReason = 'end_turn';
    let currentToolId = '';
    let currentToolName = '';
    let currentToolInput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          switch (event.type) {
            case 'content_block_start': {
              if (event.content_block?.type === 'tool_use') {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInput = '';
              }
              break;
            }
            case 'content_block_delta': {
              if (event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                fullText += text;
                callbacks.onTextDelta(text);
              } else if (event.delta?.type === 'input_json_delta') {
                currentToolInput += event.delta.partial_json;
              }
              break;
            }
            case 'content_block_stop': {
              if (currentToolName) {
                let input: Record<string, unknown> = {};
                try {
                  input = JSON.parse(currentToolInput);
                } catch {
                  // Malformed tool input
                }
                callbacks.onToolUse(currentToolId, currentToolName, input);
                currentToolName = '';
                currentToolInput = '';
              }
              break;
            }
            case 'message_delta': {
              if (event.delta?.stop_reason) {
                stopReason = event.delta.stop_reason;
              }
              break;
            }
            case 'message_stop': {
              callbacks.onDone(fullText, stopReason);
              return;
            }
            case 'error': {
              callbacks.onError(event.error?.message || 'Stream error');
              return;
            }
          }
        } catch {
          // Ignore malformed SSE data
        }
      }
    }

    callbacks.onDone(fullText, stopReason);
  } catch (error) {
    if (signal?.aborted) return;
    callbacks.onError((error as Error).message);
  }
}
