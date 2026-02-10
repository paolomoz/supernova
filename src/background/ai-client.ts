// AI client with Anthropic direct API and AWS Bedrock support
// Runs in service worker — sends events back via chrome.runtime port

import {
  ANTHROPIC_API_URL,
  ANTHROPIC_MODEL,
  BEDROCK_MODEL_ID,
  getBedrockStreamUrl,
} from '../shared/constants';

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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface AIConfig {
  useBedrock: boolean;
  apiKey: string;
  bedrockToken: string;
  awsRegion: string;
  bedrockModelId: string;
}

async function getConfig(): Promise<AIConfig> {
  const data = await chrome.storage.local.get([
    'ANTHROPIC_API_KEY',
    'USE_BEDROCK',
    'BEDROCK_TOKEN',
    'AWS_REGION',
    'BEDROCK_MODEL_ID',
  ]);
  return {
    useBedrock:
      data.USE_BEDROCK === true ||
      data.USE_BEDROCK === '1' ||
      data.USE_BEDROCK === 'true',
    apiKey: data.ANTHROPIC_API_KEY || '',
    bedrockToken: data.BEDROCK_TOKEN || '',
    awsRegion: data.AWS_REGION || 'us-east-1',
    bedrockModelId: data.BEDROCK_MODEL_ID || BEDROCK_MODEL_ID,
  };
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared streaming event processing
// ---------------------------------------------------------------------------

interface StreamState {
  fullText: string;
  stopReason: string;
  currentToolId: string;
  currentToolName: string;
  currentToolInput: string;
}

function createStreamState(): StreamState {
  return {
    fullText: '',
    stopReason: 'end_turn',
    currentToolId: '',
    currentToolName: '',
    currentToolInput: '',
  };
}

/** Process a single Anthropic streaming event. Returns 'done' or 'error' to stop, 'continue' otherwise. */
function processEvent(
  event: Record<string, unknown>,
  state: StreamState,
  callbacks: StreamCallbacks,
): 'continue' | 'done' | 'error' {
  switch (event.type) {
    case 'content_block_start': {
      const block = event.content_block as Record<string, unknown> | undefined;
      if (block?.type === 'tool_use') {
        state.currentToolId = block.id as string;
        state.currentToolName = block.name as string;
        state.currentToolInput = '';
      }
      return 'continue';
    }
    case 'content_block_delta': {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta') {
        const text = delta.text as string;
        state.fullText += text;
        callbacks.onTextDelta(text);
      } else if (delta?.type === 'input_json_delta') {
        state.currentToolInput += delta.partial_json as string;
      }
      return 'continue';
    }
    case 'content_block_stop': {
      if (state.currentToolName) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(state.currentToolInput);
        } catch {
          // Malformed tool input
        }
        callbacks.onToolUse(state.currentToolId, state.currentToolName, input);
        state.currentToolName = '';
        state.currentToolInput = '';
      }
      return 'continue';
    }
    case 'message_delta': {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta?.stop_reason) {
        state.stopReason = delta.stop_reason as string;
      }
      return 'continue';
    }
    case 'message_stop': {
      callbacks.onDone(state.fullText, state.stopReason);
      return 'done';
    }
    case 'error': {
      const err = event.error as Record<string, unknown> | undefined;
      callbacks.onError((err?.message as string) || 'Stream error');
      return 'error';
    }
    default:
      return 'continue';
  }
}

// ---------------------------------------------------------------------------
// SSE stream reader (direct Anthropic API)
// ---------------------------------------------------------------------------

async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: StreamState,
  callbacks: StreamCallbacks,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

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
        const result = processEvent(event, state, callbacks);
        if (result !== 'continue') return;
      } catch {
        // Ignore malformed SSE data
      }
    }
  }

  // If stream ends without message_stop
  callbacks.onDone(state.fullText, state.stopReason);
}

// ---------------------------------------------------------------------------
// AWS event stream binary reader (Bedrock)
// ---------------------------------------------------------------------------

const textDec = new TextDecoder();

/**
 * Parse AWS event stream binary format from Bedrock invoke-with-response-stream.
 *
 * Message layout:
 *   [total_length: u32] [headers_length: u32] [prelude_crc: u32]
 *   [headers: headers_length bytes]
 *   [payload: total_length - headers_length - 16 bytes]
 *   [message_crc: u32]
 *
 * Header entry:
 *   [name_len: u8] [name] [value_type: u8] [value_len: u16] [value]
 *   (value_type 7 = string)
 *
 * Chunk payload: {"bytes": "<base64>"}
 * Decoded bytes = Anthropic streaming event JSON.
 */
async function readAWSEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: StreamState,
  callbacks: StreamCallbacks,
): Promise<void> {
  let buffer = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Append new data
    const merged = new Uint8Array(buffer.length + value.length);
    merged.set(buffer);
    merged.set(value, buffer.length);
    buffer = merged;

    // Process complete binary messages
    while (buffer.length >= 12) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const totalLen = view.getUint32(0);

      if (buffer.length < totalLen) break; // Need more data

      const headersLen = view.getUint32(4);
      // Bytes 8-11: prelude CRC (skip)

      // Parse headers
      let eventType = '';
      let messageType = '';
      let pos = 12;
      const headersEnd = 12 + headersLen;

      while (pos < headersEnd) {
        const nameLen = buffer[pos];
        pos += 1;
        const name = textDec.decode(buffer.subarray(pos, pos + nameLen));
        pos += nameLen;
        const valType = buffer[pos];
        pos += 1;

        if (valType === 7) {
          // String value
          const valLen = new DataView(buffer.buffer, buffer.byteOffset + pos, 2).getUint16(0);
          pos += 2;
          const val = textDec.decode(buffer.subarray(pos, pos + valLen));
          pos += valLen;

          if (name === ':event-type') eventType = val;
          if (name === ':message-type') messageType = val;
        } else {
          // Unknown value type — skip remaining headers
          break;
        }
      }

      // Extract payload
      const payloadStart = 12 + headersLen;
      const payloadLen = totalLen - headersLen - 16;
      const payload = buffer.subarray(payloadStart, payloadStart + payloadLen);

      // Handle exceptions
      if (messageType === 'exception') {
        const text = textDec.decode(payload);
        callbacks.onError(`Bedrock error (${eventType}): ${text}`);
        return;
      }

      // Handle chunk events
      if (eventType === 'chunk' && payloadLen > 0) {
        try {
          const payloadJson = JSON.parse(textDec.decode(payload));
          if (payloadJson.bytes) {
            const decoded = atob(payloadJson.bytes);
            const event = JSON.parse(decoded);
            const result = processEvent(event, state, callbacks);
            if (result !== 'continue') return;
          }
        } catch {
          // Ignore malformed chunks
        }
      }

      // Advance past this message
      buffer = buffer.slice(totalLen);
    }
  }

  // If stream ends without message_stop
  callbacks.onDone(state.fullText, state.stopReason);
}

// ---------------------------------------------------------------------------
// Unified request dispatcher
// ---------------------------------------------------------------------------

async function makeStreamRequest(
  messages: Array<{ role: string; content: unknown }>,
  system: string,
  tools: ToolDefinition[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const config = await getConfig();

  if (config.useBedrock) {
    // --- AWS Bedrock path ---
    if (!config.bedrockToken) {
      callbacks.onError('Bedrock token not configured. Go to Settings to add your ABSK token.');
      return;
    }

    const url = getBedrockStreamUrl(config.awsRegion, config.bedrockModelId);
    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system,
      messages,
    };
    if (tools.length > 0) body.tools = tools;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.bedrockToken}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(`Bedrock API error ${response.status}: ${errorText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const state = createStreamState();
    await readAWSEventStream(reader, state, callbacks);
  } else {
    // --- Direct Anthropic API path ---
    if (!config.apiKey) {
      callbacks.onError('Anthropic API key not configured. Go to Settings to add your key.');
      return;
    }

    const body: Record<string, unknown> = {
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      stream: true,
      system,
      messages,
    };
    if (tools.length > 0) body.tools = tools;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
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

    const state = createStreamState();
    await readSSEStream(reader, state, callbacks);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function streamChat(
  prompt: string,
  history: AIMessage[],
  tools: ToolDefinition[],
  callbacks: StreamCallbacks,
  context?: ChatContext,
  signal?: AbortSignal,
): Promise<void> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: prompt },
  ];

  try {
    await makeStreamRequest(messages, buildSystemPrompt(context), tools, callbacks, signal);
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

  try {
    await makeStreamRequest(messages, buildSystemPrompt(context), tools, callbacks, signal);
  } catch (error) {
    if (signal?.aborted) return;
    callbacks.onError((error as Error).message);
  }
}
