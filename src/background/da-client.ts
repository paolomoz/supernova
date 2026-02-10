// DA Admin API client — adapted from Nova, using in-memory token cache

import { getDAToken, clearCachedToken } from './da-token';
import { DA_ADMIN_HOST, AEM_ADMIN_HOST } from '../shared/constants';

interface DAListEntry {
  name: string;
  path: string;
  lastModified?: string;
  ext?: string;
}

interface DASourceResponse {
  content: string;
  contentType: string;
  lastModified?: string;
}

async function daFetch(path: string, _org: string, _repo: string, init?: RequestInit): Promise<Response> {
  const token = await getDAToken();
  const url = `${DA_ADMIN_HOST}${path}`;

  let response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });

  // Retry once on 401
  if (response.status === 401) {
    clearCachedToken();
    const freshToken = await getDAToken();
    response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${freshToken}`, ...init?.headers },
    });
  }

  return response;
}

function basePath(org: string, repo: string): string {
  return `/${org}/${repo}`;
}

export async function listPages(org: string, repo: string, path: string = '/'): Promise<DAListEntry[]> {
  const response = await daFetch(`/list${basePath(org, repo)}${path}`, org, repo);
  if (!response.ok) throw new Error(`DA list failed: ${response.status}`);
  const data = (await response.json()) as DAListEntry[];
  const prefix = basePath(org, repo);
  return data.map((entry) => ({
    ...entry,
    path: entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) || '/' : entry.path,
  }));
}

export async function getSource(org: string, repo: string, path: string): Promise<DASourceResponse> {
  const response = await daFetch(`/source${basePath(org, repo)}${path}`, org, repo);
  if (!response.ok) throw new Error(`DA getSource failed: ${response.status}`);
  const content = await response.text();
  return {
    content,
    contentType: response.headers.get('content-type') || 'text/html',
    lastModified: response.headers.get('last-modified') || undefined,
  };
}

export async function putSource(org: string, repo: string, path: string, htmlContent: string): Promise<void> {
  const formData = new FormData();
  formData.append('data', new Blob([htmlContent], { type: 'text/html' }), 'index.html');

  const response = await daFetch(`/source${basePath(org, repo)}${path}`, org, repo, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DA putSource failed: ${response.status} — ${error}`);
  }
}

export async function deleteSource(org: string, repo: string, path: string): Promise<void> {
  const response = await daFetch(`/source${basePath(org, repo)}${path}`, org, repo, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`DA deleteSource failed: ${response.status}`);
}

export async function copyPage(org: string, repo: string, source: string, dest: string): Promise<void> {
  const response = await daFetch(`/copy${basePath(org, repo)}${source}`, org, repo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: `${basePath(org, repo)}${dest}` }),
  });
  if (!response.ok) throw new Error(`DA copy failed: ${response.status}`);
}

export async function movePage(org: string, repo: string, source: string, dest: string): Promise<void> {
  const response = await daFetch(`/move${basePath(org, repo)}${source}`, org, repo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: `${basePath(org, repo)}${dest}` }),
  });
  if (!response.ok) throw new Error(`DA move failed: ${response.status}`);
}

export async function previewPage(org: string, repo: string, path: string): Promise<string> {
  const token = await getDAToken();
  const response = await fetch(
    `${AEM_ADMIN_HOST}/preview/${org}/${repo}/main${path}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`AEM preview failed: ${response.status}`);
  return `https://main--${repo}--${org}.aem.page${path}`;
}

export async function publishPage(org: string, repo: string, path: string): Promise<string> {
  const token = await getDAToken();
  const response = await fetch(
    `${AEM_ADMIN_HOST}/live/${org}/${repo}/main${path}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`AEM publish failed: ${response.status}`);
  return `https://main--${repo}--${org}.aem.live${path}`;
}

export async function uploadMedia(
  org: string, repo: string, path: string, data: Blob, filename: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('data', data, filename);

  const response = await daFetch(`/source${basePath(org, repo)}${path}`, org, repo, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) throw new Error(`DA uploadMedia failed: ${response.status}`);
  return `${DA_ADMIN_HOST}/source${basePath(org, repo)}${path}`;
}
