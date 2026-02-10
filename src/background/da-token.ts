// IMS token exchange — in-memory cache (replaces KV from Nova)

const IMS_TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';
const TOKEN_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours

let cachedToken: { token: string; obtainedAt: number } | null = null;

interface DACredentials {
  DA_CLIENT_ID: string;
  DA_CLIENT_SECRET: string;
  DA_SERVICE_TOKEN: string;
}

async function getCredentials(): Promise<DACredentials | null> {
  const data = await chrome.storage.local.get(['DA_CLIENT_ID', 'DA_CLIENT_SECRET', 'DA_SERVICE_TOKEN']);
  if (!data.DA_CLIENT_ID || !data.DA_CLIENT_SECRET || !data.DA_SERVICE_TOKEN) {
    return null;
  }
  return {
    DA_CLIENT_ID: data.DA_CLIENT_ID,
    DA_CLIENT_SECRET: data.DA_CLIENT_SECRET,
    DA_SERVICE_TOKEN: data.DA_SERVICE_TOKEN,
  };
}

async function exchangeForAccessToken(creds: DACredentials): Promise<string> {
  const formParams = new URLSearchParams();
  formParams.append('grant_type', 'authorization_code');
  formParams.append('client_id', creds.DA_CLIENT_ID);
  formParams.append('client_secret', creds.DA_CLIENT_SECRET);
  formParams.append('code', creds.DA_SERVICE_TOKEN);

  const response = await fetch(IMS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IMS token exchange failed: ${response.status} — ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('No access token received from IMS');
  }

  return data.access_token;
}

export async function getDAToken(): Promise<string> {
  // Check in-memory cache
  if (cachedToken && Date.now() - cachedToken.obtainedAt < TOKEN_MAX_AGE_MS) {
    return cachedToken.token;
  }

  const creds = await getCredentials();
  if (!creds) {
    throw new Error('DA credentials not configured. Go to Settings to add your credentials.');
  }

  const accessToken = await exchangeForAccessToken(creds);
  cachedToken = { token: accessToken, obtainedAt: Date.now() };
  return accessToken;
}

export function clearCachedToken(): void {
  cachedToken = null;
}
