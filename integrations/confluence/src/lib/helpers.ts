import { ConfluenceClient, type ConfluenceClientConfig } from './client';
import { confluenceServiceError } from './errors';

export interface AuthOutput {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  cloudId?: string;
  baseUrl?: string;
}

export interface ConfigOutput {
  cloudId?: string;
  baseUrl?: string;
}

export let resolveContentIdAlias = (input: {
  pageId?: string;
  contentId?: string;
  page_id?: string;
  content_id?: string;
  id?: string;
}) => {
  let selectedId =
    input.pageId ?? input.contentId ?? input.page_id ?? input.content_id ?? input.id;
  return selectedId?.trim() || undefined;
};

let decodeConfluenceTinyLink = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return undefined;

  let base64 = value.replace(/-/g, '/').replace(/_/g, '+');
  let decoded = Buffer.from(base64, 'base64');

  while (decoded.length < 4 && base64.length < 8) {
    base64 += 'A';
    decoded = Buffer.from(base64, 'base64');
  }

  if (decoded.length !== 4) return undefined;

  let pageId = decoded.readUInt32LE(0);
  return pageId > 0 ? pageId.toString() : undefined;
};

let resolveConfluencePageUrl = (value: string | undefined) => {
  if (!value?.trim()) return undefined;

  try {
    let url = new URL(value);
    let queryPageId = url.searchParams.get('pageId')?.trim();
    if (queryPageId && /^\d+$/.test(queryPageId)) return queryPageId;

    let pathPageId = url.pathname.match(/\/pages\/(\d+)(?:\/|$)/)?.[1];
    if (pathPageId) return pathPageId;

    let tinyLink = url.pathname.match(/\/x\/([^/]+)\/?$/)?.[1];
    return tinyLink ? decodeConfluenceTinyLink(tinyLink) : undefined;
  } catch {
    return undefined;
  }
};

export let resolvePageIdInput = (input: {
  pageId?: string;
  contentId?: string;
  page_id?: string;
  content_id?: string;
  id?: string;
  url?: string;
}) => {
  let hasIdInput =
    input.pageId !== undefined ||
    input.contentId !== undefined ||
    input.page_id !== undefined ||
    input.content_id !== undefined ||
    input.id !== undefined;

  return hasIdInput ? resolveContentIdAlias(input) : resolveConfluencePageUrl(input.url);
};

export let resolveLimitAlias = (input: { limit?: number; maxResults?: number }) => {
  return input.limit ?? input.maxResults ?? 25;
};

export let createClient = (auth: AuthOutput, config: ConfigOutput): ConfluenceClient => {
  let cloudId = auth.cloudId || config.cloudId;
  let providedBaseUrl = auth.baseUrl || config.baseUrl;

  let authType: ConfluenceClientConfig['authType'];
  if (cloudId) {
    // OAuth Cloud or Basic Auth Cloud — check if it looks like a Base64 basic token
    // Basic auth tokens contain a colon when decoded (email:token)
    let isBasic = false;
    try {
      let decoded = atob(auth.token);
      if (decoded.includes(':')) {
        isBasic = true;
      }
    } catch {
      // Not valid base64, treat as bearer
    }
    authType = isBasic ? 'basic' : 'oauth';
  } else {
    authType = 'bearer';
  }

  if (authType === 'basic' && !providedBaseUrl) {
    throw confluenceServiceError(
      'Confluence API token authentication requires a site base URL. Reconnect the account or set the Confluence Cloud baseUrl.'
    );
  }

  let baseUrl = authType === 'oauth' && cloudId ? undefined : providedBaseUrl;

  return new ConfluenceClient({
    token: auth.token,
    cloudId,
    baseUrl,
    authType
  });
};
