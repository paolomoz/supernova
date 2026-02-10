export const DA_ADMIN_HOST = 'https://admin.da.live';
export const AEM_ADMIN_HOST = 'https://admin.hlx.page';
export const IMS_TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

export function getPreviewUrl(org: string, repo: string, path: string, ref = 'main'): string {
  return `https://${ref}--${repo}--${org}.aem.page${path}`;
}

export function getLiveUrl(org: string, repo: string, path: string, ref = 'main'): string {
  return `https://${ref}--${repo}--${org}.aem.live${path}`;
}
