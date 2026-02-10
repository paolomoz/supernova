// Execute AI tools — bridges tool calls to DA client operations

import * as da from './da-client';

interface ToolContext {
  org: string;
  repo: string;
  path: string;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context?: ToolContext,
): Promise<string> {
  const org = context?.org || '';
  const repo = context?.repo || '';

  if (!org || !repo) {
    if (!['emit_insight'].includes(name)) {
      return 'Error: No DA context available. Open a page in DA first.';
    }
  }

  try {
    switch (name) {
      case 'list_pages': {
        const items = await da.listPages(org, repo, (input.path as string) || '/');
        return JSON.stringify(items, null, 2);
      }

      case 'read_page': {
        const readPath = (input.path as string);
        const pagePath = readPath.endsWith('.html') ? readPath : `${readPath}.html`;
        const source = await da.getSource(org, repo, pagePath);
        return source.content;
      }

      case 'create_page': {
        const pagePath = (input.path as string);
        const htmlPath = pagePath.endsWith('.html') ? pagePath : `${pagePath}.html`;
        await da.putSource(org, repo, htmlPath, input.content as string);
        // Trigger preview
        try {
          await da.previewPage(org, repo, pagePath.replace(/\.html$/, ''));
        } catch {
          // Preview trigger is non-fatal
        }
        return `Page created at ${pagePath}`;
      }

      case 'delete_page': {
        const delPath = (input.path as string);
        const delHtmlPath = delPath.endsWith('.html') ? delPath : `${delPath}.html`;
        await da.deleteSource(org, repo, delHtmlPath);
        return `Page deleted at ${delPath}`;
      }

      case 'copy_page': {
        await da.copyPage(org, repo, input.source as string, input.destination as string);
        return `Copied ${input.source} to ${input.destination}`;
      }

      case 'move_page': {
        await da.movePage(org, repo, input.source as string, input.destination as string);
        return `Moved ${input.source} to ${input.destination}`;
      }

      case 'preview_page': {
        const url = await da.previewPage(org, repo, input.path as string);
        return `Preview triggered: ${url}`;
      }

      case 'publish_page': {
        const url = await da.publishPage(org, repo, input.path as string);
        return `Published: ${url}`;
      }

      case 'emit_insight': {
        // This is handled specially by the service worker — it sends the insight
        // to the panel directly rather than as a tool result
        return JSON.stringify({
          type: 'insight',
          message: input.message,
          insightType: input.type || 'suggestion',
        });
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
}
