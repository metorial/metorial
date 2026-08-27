import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  auth,
  GRANULAR_CUSTOM_CONNECTION_SCOPES,
  LEGACY_CUSTOM_CONNECTION_SCOPES
} from './auth';
import { config } from './config';
import { createClientFromContext } from './lib/helpers';

let http = vi.hoisted(() => ({
  createAxios: vi.fn(),
  tokenPost: vi.fn(),
  connectionsGet: vi.fn(),
  profileGet: vi.fn(),
  responseInterceptorUse: vi.fn()
}));

vi.mock('@slates/provider', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/provider')>();

  return {
    ...actual,
    createAxios: http.createAxios
  };
});

let expectedScopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.invoices',
  'accounting.payments',
  'accounting.banktransactions',
  'accounting.manualjournals',
  'accounting.contacts',
  'accounting.settings',
  'accounting.reports.aged.read',
  'accounting.reports.balancesheet.read',
  'accounting.reports.banksummary.read',
  'accounting.reports.budgetsummary.read',
  'accounting.reports.executivesummary.read',
  'accounting.reports.profitandloss.read',
  'accounting.reports.trialbalance.read',
  'accounting.reports.tenninetynine.read'
];

let getOauthMethod = () => {
  let method = auth.authStack.find(candidate => candidate.type === 'auth.oauth');
  expect(method).toBeDefined();
  return method as Extract<(typeof auth.authStack)[number], { type: 'auth.oauth' }>;
};

let getCustomConnectionMethod = () => {
  let method = auth.authStack.find(candidate => candidate.key === 'client_credentials');
  expect(method).toBeDefined();
  return method as Extract<(typeof auth.authStack)[number], { type: 'auth.custom' }>;
};

let jwt = (payload: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

let callback = (accessToken: string) => {
  http.tokenPost.mockResolvedValueOnce({
    data: {
      access_token: accessToken,
      refresh_token: 'refresh-token',
      expires_in: 3600
    }
  });

  return getOauthMethod().handleCallback?.({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    code: 'authorization-code',
    redirectUri: 'http://localhost:45873/callback',
    callbackParams: {},
    callbackState: {},
    scopes: expectedScopes,
    state: 'state'
  } as never);
};

beforeEach(() => {
  http.createAxios.mockReset();
  http.tokenPost.mockReset();
  http.connectionsGet.mockReset();
  http.profileGet.mockReset();
  http.responseInterceptorUse.mockReset();

  http.createAxios.mockImplementation((axiosConfig?: { baseURL?: string }) => {
    if (axiosConfig?.baseURL === 'https://identity.xero.com') {
      return {
        post: http.tokenPost,
        get: http.profileGet
      };
    }

    if (axiosConfig?.baseURL === 'https://api.xero.com') {
      return {
        get: http.connectionsGet
      };
    }

    return {
      interceptors: {
        response: {
          use: http.responseInterceptorUse
        }
      }
    };
  });
});

describe('xero config contract', () => {
  it('does not expose tenantId in the setup JSON schema', () => {
    let jsonSchema = z.toJSONSchema(config.configSchema) as {
      properties?: Record<string, unknown>;
    };

    expect(jsonSchema.properties).not.toHaveProperty('tenantId');
    expect(config.configSchema.parse({ tenantId: 'ignored-tenant' })).toEqual({});
  });
});

describe('xero auth scope contract', () => {
  let oauth = auth.authStack.find(method => method.type === 'auth.oauth');

  it('accepts OAuth and Custom Connection outputs', () => {
    expect(
      auth.outputSchema.safeParse({ token: 'oauth-token', tenantId: 'tenant-id' }).success
    ).toBe(true);
    expect(auth.outputSchema.safeParse({ token: 'custom-token' }).success).toBe(true);
  });

  it('requests exactly the scopes required by the OAuth flow and registered tools', () => {
    expect(oauth).toBeDefined();
    expect(oauth?.scopes.map(entry => entry.scope)).toEqual(expectedScopes);
  });

  it('does not rely on defaultChecked because production requests every declared scope', () => {
    expect(oauth).toBeDefined();
    for (let entry of oauth?.scopes ?? []) {
      expect(entry.defaultChecked, entry.scope).toBeUndefined();
    }
  });

  it('requests the report scopes used by live scenarios for custom connections', () => {
    let reportScopes = [
      'accounting.reports.budgetsummary.read',
      'accounting.reports.tenninetynine.read'
    ];

    expect(GRANULAR_CUSTOM_CONNECTION_SCOPES.split(' ')).toEqual(
      expect.arrayContaining(reportScopes)
    );
    expect(LEGACY_CUSTOM_CONNECTION_SCOPES.split(' ')).toContain(
      'accounting.reports.tenninetynine.read'
    );
  });
});

describe('xero OAuth tenant resolution', () => {
  it('disables Xero bulk organisation selection in the authorization flow', async () => {
    let result = await getOauthMethod().getAuthorizationUrl?.({
      clientId: 'client-id',
      redirectUri: 'https://example.com/callback',
      scopes: expectedScopes,
      state: 'state-123'
    } as never);

    let url = new URL(result?.url ?? '');
    expect(url.searchParams.get('acr_values')).toBe('bulk_connect:false');
  });

  it('decodes a Base64URL JWT, binds the lookup to its auth event, and pins the exact tenant', async () => {
    let accessToken = jwt({
      authentication_event_id: 'auth-event-123',
      filler: '😀'
    });
    expect(accessToken.split('.')[1]).toMatch(/[-_]/);
    http.connectionsGet.mockResolvedValueOnce({
      data: [{ tenantId: 'tenant-exact' }]
    });

    let result = await callback(accessToken);

    expect(http.connectionsGet).toHaveBeenCalledWith('/connections', {
      params: { authEventId: 'auth-event-123' },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    expect(result?.output).toMatchObject({
      token: accessToken,
      refreshToken: 'refresh-token',
      tenantId: 'tenant-exact'
    });
  });

  it('rejects a malformed access token before querying connections', async () => {
    await expect(callback('not-a-jwt')).rejects.toThrow(/malformed/i);
    expect(http.connectionsGet).not.toHaveBeenCalled();
  });

  it('rejects an access token without authentication_event_id', async () => {
    await expect(callback(jwt({ sub: 'user-123' }))).rejects.toThrow(
      /authentication_event_id/i
    );
    expect(http.connectionsGet).not.toHaveBeenCalled();
  });

  it('rejects a current auth event with no organisation', async () => {
    http.connectionsGet.mockResolvedValueOnce({ data: [] });

    await expect(callback(jwt({ authentication_event_id: 'auth-event-123' }))).rejects.toThrow(
      /no organisation/i
    );
  });

  it('rejects a bulk auth event instead of guessing between organisations', async () => {
    http.connectionsGet.mockResolvedValueOnce({
      data: [{ tenantId: 'tenant-1' }, { tenantId: 'tenant-2' }]
    });

    await expect(callback(jwt({ authentication_event_id: 'auth-event-123' }))).rejects.toThrow(
      /returned 2 organisations.*select exactly one/i
    );
  });

  it.each([
    [{}],
    [{ tenantId: '' }],
    [{ tenantId: '   ' }]
  ])('rejects a single connection without a non-empty tenantId', async connection => {
    http.connectionsGet.mockResolvedValueOnce({ data: [connection] });

    await expect(callback(jwt({ authentication_event_id: 'auth-event-123' }))).rejects.toThrow(
      /tenantId/i
    );
  });

  it('preserves a pinned tenant and refresh token without reselecting a connection', async () => {
    http.tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'opaque-refreshed-token',
        expires_in: 1800
      }
    });

    let result = await getOauthMethod().handleTokenRefresh?.({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      output: {
        token: 'old-token',
        refreshToken: 'existing-refresh-token',
        tenantId: 'pinned-tenant'
      },
      scopes: expectedScopes
    } as never);

    expect(http.connectionsGet).not.toHaveBeenCalled();
    expect(result?.output).toMatchObject({
      token: 'opaque-refreshed-token',
      refreshToken: 'existing-refresh-token',
      tenantId: 'pinned-tenant'
    });
  });

  it('rejects refresh when the OAuth connection has no pinned tenant', async () => {
    http.tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });

    await expect(
      getOauthMethod().handleTokenRefresh?.({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        output: {
          token: 'old-token',
          refreshToken: 'existing-refresh-token'
        },
        scopes: expectedScopes
      } as never)
    ).rejects.toThrow(/missing its tenant ID/i);
    expect(http.connectionsGet).not.toHaveBeenCalled();
  });
});

describe('xero Custom Connection and client tenant contract', () => {
  it('returns a tenantless Custom Connection output', async () => {
    http.tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'custom-connection-token',
        expires_in: 1800
      }
    });

    let result = await getCustomConnectionMethod().getOutput({
      input: {
        clientId: 'client-id',
        clientSecret: 'client-secret'
      }
    } as never);

    expect(result.output).toMatchObject({
      token: 'custom-connection-token'
    });
    expect(result.output).not.toHaveProperty('tenantId');
  });

  it('omits xero-tenant-id when auth has no tenant', () => {
    createClientFromContext({
      auth: { token: 'custom-connection-token' }
    });

    let clientConfig = http.createAxios.mock.calls.find(
      ([axiosConfig]) => axiosConfig?.baseURL === 'https://api.xero.com/api.xro/2.0'
    )?.[0];
    expect(clientConfig?.headers).not.toHaveProperty('xero-tenant-id');
  });

  it('uses the tenant pinned in OAuth auth output', () => {
    createClientFromContext({
      auth: {
        token: 'oauth-token',
        tenantId: 'pinned-auth-tenant'
      }
    });

    let clientConfig = http.createAxios.mock.calls.find(
      ([axiosConfig]) => axiosConfig?.baseURL === 'https://api.xero.com/api.xro/2.0'
    )?.[0];
    expect(clientConfig?.headers?.['xero-tenant-id']).toBe('pinned-auth-tenant');
  });
});
