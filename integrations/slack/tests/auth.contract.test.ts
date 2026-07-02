import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

let slackPost = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  slackPost.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL === 'https://slack.com/api') {
          return {
            post: slackPost
          };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('../src/index');
  return createLocalSlateTestClient({ slate: provider });
};

let callbackParams = {
  authenticationMethodId: 'user_oauth',
  code: 'auth-code',
  state: 'state-123',
  redirectUri: 'https://example.com/callback',
  input: {},
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scopes: ['channels:read']
};

let refreshParams = {
  authenticationMethodId: 'user_oauth',
  output: {
    token: 'stale-user-token',
    refreshToken: 'stored-refresh-token',
    actorType: 'user' as const,
    teamId: 'T-prev',
    userId: 'U-prev'
  },
  input: {},
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scopes: ['channels:read']
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('slack user oauth contract', () => {
  it('builds the user OAuth authorization URL with user_scope', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'user_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['channels:read', 'groups:read']
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://slack.com/oauth/v2/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('scope')).toBeNull();
    expect(url.searchParams.get('user_scope')).toBe('channels:read,groups:read');
  });

  it('exchanges user OAuth codes with oauth.v2.user.access and maps top-level user tokens', async () => {
    let client = await loadProviderClient();

    slackPost.mockResolvedValueOnce({
      data: {
        ok: true,
        access_token: 'xoxp-user-token',
        refresh_token: 'user-refresh-token',
        expires_in: 3600,
        token_type: 'user',
        team_id: 'T-team',
        team_name: 'Example Team',
        authed_user: {
          id: 'U-user',
          scope: 'channels:read,groups:read'
        }
      }
    });

    let result = await client.handleAuthorizationCallback(callbackParams);

    expect(slackPost).toHaveBeenCalledWith('/oauth.v2.user.access', null, {
      params: {
        code: 'auth-code',
        client_id: 'client-id',
        client_secret: 'client-secret',
        redirect_uri: 'https://example.com/callback'
      }
    });
    expect(result.scopes).toEqual(['channels:read', 'groups:read']);
    expect(result.output).toMatchObject({
      token: 'xoxp-user-token',
      refreshToken: 'user-refresh-token',
      actorType: 'user',
      teamId: 'T-team',
      teamName: 'Example Team',
      userId: 'U-user'
    });
    expect(Date.parse(String(result.output.expiresAt))).toBeGreaterThan(Date.now());
  });

  it('still maps nested authed_user token responses', async () => {
    let client = await loadProviderClient();

    slackPost.mockResolvedValueOnce({
      data: {
        ok: true,
        team: { id: 'T-team', name: 'Example Team' },
        authed_user: {
          id: 'U-user',
          access_token: 'xoxp-nested-user-token',
          refresh_token: 'nested-refresh-token',
          expires_in: 3600,
          scope: 'im:read mpim:read'
        }
      }
    });

    let result = await client.handleAuthorizationCallback(callbackParams);

    expect(result.scopes).toEqual(['im:read', 'mpim:read']);
    expect(result.output).toMatchObject({
      token: 'xoxp-nested-user-token',
      refreshToken: 'nested-refresh-token',
      actorType: 'user',
      teamId: 'T-team',
      teamName: 'Example Team',
      userId: 'U-user'
    });
  });

  it('refreshes user OAuth tokens from top-level user token fields', async () => {
    let client = await loadProviderClient();

    slackPost.mockResolvedValueOnce({
      data: {
        ok: true,
        access_token: 'xoxp-refreshed-user-token',
        expires_in: 1800,
        token_type: 'user',
        user_id: 'U-refreshed',
        team_id: 'T-refreshed'
      }
    });

    let result = await client.refreshToken(refreshParams);

    expect(slackPost).toHaveBeenCalledWith('/oauth.v2.access', null, {
      params: {
        client_id: 'client-id',
        client_secret: 'client-secret',
        grant_type: 'refresh_token',
        refresh_token: 'stored-refresh-token'
      }
    });
    expect(result.output).toMatchObject({
      token: 'xoxp-refreshed-user-token',
      refreshToken: 'stored-refresh-token',
      actorType: 'user',
      teamId: 'T-refreshed',
      userId: 'U-refreshed'
    });
    expect(Date.parse(String(result.output.expiresAt))).toBeGreaterThan(Date.now());
  });

  it('refreshes user OAuth tokens from nested authed_user token fields', async () => {
    let client = await loadProviderClient();

    slackPost.mockResolvedValueOnce({
      data: {
        ok: true,
        team: { id: 'T-nested', name: 'Nested Team' },
        authed_user: {
          id: 'U-nested',
          access_token: 'xoxp-refreshed-nested-user-token',
          refresh_token: 'nested-refresh-token',
          expires_in: 1800
        }
      }
    });

    let result = await client.refreshToken(refreshParams);

    expect(result.output).toMatchObject({
      token: 'xoxp-refreshed-nested-user-token',
      refreshToken: 'nested-refresh-token',
      actorType: 'user',
      teamId: 'T-nested',
      teamName: 'Nested Team',
      userId: 'U-nested'
    });
    expect(Date.parse(String(result.output.expiresAt))).toBeGreaterThan(Date.now());
  });

  it('rejects bot-shaped top-level OAuth responses for user OAuth', async () => {
    let client = await loadProviderClient();

    slackPost.mockResolvedValueOnce({
      data: {
        ok: true,
        access_token: 'xoxb-bot-token',
        refresh_token: 'bot-refresh-token',
        expires_in: 3600,
        token_type: 'bot',
        bot_user_id: 'B-bot',
        team: { id: 'T-team', name: 'Example Team' }
      }
    });

    await expectSlateError(
      () => client.handleAuthorizationCallback(callbackParams),
      'Slack OAuth error: missing user access token'
    );
  });
});
