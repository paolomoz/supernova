// Tool definitions for Claude tool-use — adapted from Nova

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'list_pages',
      description: 'List all pages and folders in a directory. Returns name, path, and type for each item.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list (e.g. "/en", "/"). Defaults to "/".' },
        },
        required: [],
      },
    },
    {
      name: 'read_page',
      description: 'Read the HTML source content of a page.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Page path (e.g. "/en/index")' },
        },
        required: ['path'],
      },
    },
    {
      name: 'create_page',
      description: `Create a new page with HTML content using EDS block markup.

EDS block structure rules:
- A block is: <div class="block-name"><div>...rows...</div></div>
- Each row is a direct child <div> of the block. Each cell is a direct child <div> of a row.
- Columns: ONE row with N cells (not N rows with 1 cell). Example: <div class="columns"><div><div>Col1</div><div>Col2</div></div></div>
- Cards: N rows, each row is one card. Each card row has cells (e.g. image cell + text cell). Example: <div class="cards"><div><div><picture><img></picture></div><div><h3>Title</h3><p>Text</p></div></div></div>
- Accordion: N rows, each row has a question cell + answer cell.
- Tabs: N rows, each row has a label cell + content cell.
- Hero: 1 row with image cell + text cell.
- Images use <picture><img src="..." alt="..."></picture>.
- Section breaks: <hr>. Section metadata: <div class="section-metadata"><div><div>key</div><div>value</div></div></div> placed BEFORE the <hr>.
- Variants are space-separated classes: <div class="cards horizontal">.`,
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Page path (e.g. "/en/test")' },
          content: { type: 'string', description: 'HTML content for the page using EDS block markup' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'delete_page',
      description: 'Delete a page or folder.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to delete' },
        },
        required: ['path'],
      },
    },
    {
      name: 'copy_page',
      description: 'Copy a page or folder to a new location.',
      input_schema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source path to copy from' },
          destination: { type: 'string', description: 'Destination path to copy to' },
        },
        required: ['source', 'destination'],
      },
    },
    {
      name: 'move_page',
      description: 'Move a page or folder to a new location. Also used for renaming.',
      input_schema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source path' },
          destination: { type: 'string', description: 'Destination path' },
        },
        required: ['source', 'destination'],
      },
    },
    {
      name: 'preview_page',
      description: 'Trigger EDS preview for a page. Returns the preview URL.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Page path to preview' },
        },
        required: ['path'],
      },
    },
    {
      name: 'publish_page',
      description: 'Publish a page to the live site. Returns the live URL.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Page path to publish' },
        },
        required: ['path'],
      },
    },
    {
      name: 'emit_insight',
      description: 'Emit a proactive insight or suggestion card to the user. Use this to proactively suggest improvements, warn about issues, or provide helpful information. The insight appears as a dismissible card in the chat.',
      input_schema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The insight message to display' },
          type: { type: 'string', description: 'Type of insight', enum: ['suggestion', 'warning', 'info'] },
        },
        required: ['message'],
      },
    },
  ];
}
