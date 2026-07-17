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
}) => {
  let selectedId = input.pageId ?? input.contentId ?? input.page_id ?? input.content_id;
  return selectedId?.trim() || undefined;
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
