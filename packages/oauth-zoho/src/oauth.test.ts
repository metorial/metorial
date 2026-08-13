import { ServiceError } from '@lowerdeck/error';
import { createAxios } from 'slates';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createZohoOauth, type ZohoApplicationType, type ZohoOauthInput } from './oauth';
import { ZOHO_REGION_CODES, ZOHO_REGION_METADATA, type ZohoRegion } from './regions';

let httpMocks = vi.hoisted(() => ({
  post: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: vi.fn((config?: { baseURL?: string }) => ({
      post: (...args: unknown[]) => httpMocks.post(config, ...args)
    }))
  };
});

let apiOrigins = {
  us: ['https://www.zohoapis.com'],
  eu: ['https://www.zohoapis.eu'],
  in: ['https://www.zohoapis.in'],
  au: ['https://www.zohoapis.com.au'],
  jp: ['https://www.zohoapis.jp'],
  ca: ['https://www.zohoapis.ca'],
  sa: ['https://www.zohoapis.sa'],
  uk: ['https://www.zohoapis.uk']
} as const;

let scopes = [
  {
    title: 'Records',
    description: 'Manage records',
    scope: 'ZohoCRM.modules.ALL'
  }
];

let authorizationContext = (applicationType: ZohoApplicationType, region?: ZohoRegion) => ({
  clientId: 'customer-client-id',
  clientSecret: 'customer-client-secret',
  redirectUri: 'https://example.test/oauth/callback',
  scopes: ['ZohoCRM.modules.ALL'],
  state: 'state-123',
  input: { applicationType, region }
});

let callbackContext = (
  applicationType: ZohoApplicationType,
  callbackRegion: ZohoRegion,
  expectedRegion?: ZohoRegion
) => ({
  ...authorizationContext(applicationType, expectedRegion),
  code: 'authorization-code',
  callbackState: {},
  callbackParams: {
    location: ZOHO_REGION_METADATA[callbackRegion].callbackLocation,
    'accounts-server': ZOHO_REGION_METADATA[callbackRegion].accountsOrigin
  }
});

let oauthOptions = (
  overrides: Partial<Parameters<typeof createZohoOauth>[0]> = {}
): Parameters<typeof createZohoOauth>[0] => ({
  supportedRegions: ZOHO_REGION_CODES,
  scopes,
  apiOrigins,
  ...overrides
});

let expectServiceError = async (promise: Promise<unknown>) => {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceError);
    return error as ServiceError<any>;
  }
};

let tokenResponse = (region: ZohoRegion) => ({
  access_token: `token-${region}`,
  refresh_token: `refresh-${region}`,
  expires_in: 3600,
  api_domain: apiOrigins[region][0]
});

describe('createZohoOauth', () => {
  beforeEach(() => {
    httpMocks.post.mockReset();
    vi.mocked(createAxios).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes one OAuth method with a closed top-level input object', () => {
    let oauth = createZohoOauth({
      supportedRegions: ['us', 'eu'],
      scopes,
      apiOrigins: { us: apiOrigins.us, eu: apiOrigins.eu }
    });
    let schema = z.toJSONSchema(oauth.inputSchema);

    expect(oauth.type).toBe('auth.oauth');
    expect(oauth.key).toBe('oauth');
    expect(oauth.name).toBe('OAuth');
    expect(oauth.scopes).toBe(scopes);
    expect(schema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: ['applicationType'],
      properties: {
        applicationType: {
          enum: ['multi_dc', 'regional'],
          description:
            'Type of Zoho OAuth application. Choose multi_dc for a Multi-DC application; no region selection is required. Choose regional for a regional application; region is required.'
        },
        region: {
          enum: ['us', 'eu'],
          description:
            'Zoho data-center region. Required for a regional application and optional for a Multi-DC application.'
        }
      }
    });
    expect(schema.properties?.applicationType).not.toHaveProperty('default');
    expect(schema.properties?.region).not.toHaveProperty('default');
    expect(oauth.inputSchema.parse({ applicationType: 'multi_dc' })).toEqual({
      applicationType: 'multi_dc'
    });
    expect(oauth.inputSchema.parse({ applicationType: 'regional', region: 'eu' })).toEqual({
      applicationType: 'regional',
      region: 'eu'
    });
    expect(
      oauth.inputSchema.safeParse({ applicationType: 'multi_dc', region: 'in' }).success
    ).toBe(false);
  });

  it('requires applicationType in the public input schema', () => {
    let oauth = createZohoOauth(oauthOptions());

    expect(oauth.inputSchema.safeParse({}).success).toBe(false);
    expect(oauth.inputSchema.safeParse({ region: 'eu' }).success).toBe(false);
  });

  it('rejects regional authorization without a region before redirect or HTTP', async () => {
    let oauth = createZohoOauth(oauthOptions());

    await expectServiceError(oauth.getAuthorizationUrl(authorizationContext('regional')));
    expect(createAxios).not.toHaveBeenCalled();
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it.each(
    ZOHO_REGION_CODES
  )('starts regional %s authorization at the selected Accounts origin', async region => {
    let oauth = createZohoOauth(oauthOptions());
    let { url } = await oauth.getAuthorizationUrl(authorizationContext('regional', region));
    let parsed = new URL(url);

    expect(parsed.origin).toBe(ZOHO_REGION_METADATA[region].accountsOrigin);
    expect(parsed.pathname).toBe('/oauth/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('customer-client-id');
    expect(parsed.searchParams.get('scope')).toBe('ZohoCRM.modules.ALL');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://example.test/oauth/callback'
    );
    expect(parsed.searchParams.get('state')).toBe('state-123');
  });

  it.each([
    { label: 'without an expected region', region: undefined },
    { label: 'with an expected region', region: 'eu' as const }
  ])('starts multi-DC authorization globally $label', async ({ region }) => {
    let oauth = createZohoOauth(oauthOptions());
    let { url } = await oauth.getAuthorizationUrl(authorizationContext('multi_dc', region));

    expect(new URL(url).origin).toBe('https://accounts.zoho.com');
  });

  it.each(
    ZOHO_REGION_CODES
  )('infers %s from an exact multi-DC callback and exchanges there', async region => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse(region) });
    let oauth = createZohoOauth(oauthOptions());

    let result = await oauth.handleCallback(callbackContext('multi_dc', region));

    expect(createAxios).toHaveBeenCalledWith({
      baseURL: ZOHO_REGION_METADATA[region].accountsOrigin
    });
    let [config, path, body, requestConfig] = httpMocks.post.mock.calls[0]!;
    expect(config).toEqual({ baseURL: ZOHO_REGION_METADATA[region].accountsOrigin });
    expect(path).toBe('/oauth/v2/token');
    expect(new URLSearchParams(String(body))).toEqual(
      new URLSearchParams({
        client_id: 'customer-client-id',
        client_secret: 'customer-client-secret',
        code: 'authorization-code',
        redirect_uri: 'https://example.test/oauth/callback',
        grant_type: 'authorization_code'
      })
    );
    expect(requestConfig).toEqual({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    expect(result.output).toMatchObject({
      token: `token-${region}`,
      refreshToken: `refresh-${region}`,
      applicationType: 'multi_dc',
      region,
      accountsUrl: ZOHO_REGION_METADATA[region].accountsOrigin,
      apiDomain: apiOrigins[region][0]
    });
  });

  it('persists regional application type and selected region', async () => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse('eu') });
    let oauth = createZohoOauth(oauthOptions());

    let result = await oauth.handleCallback(callbackContext('regional', 'eu', 'eu'));

    expect(result.output).toMatchObject({ applicationType: 'regional', region: 'eu' });
  });

  it.each([
    {
      label: 'multi-DC expected region mismatch',
      context: callbackContext('multi_dc', 'eu', 'us')
    },
    {
      label: 'regional selected region mismatch',
      context: callbackContext('regional', 'eu', 'us')
    },
    {
      label: 'location and Accounts origin mismatch',
      context: {
        ...callbackContext('multi_dc', 'us'),
        callbackParams: { location: 'eu', 'accounts-server': 'https://accounts.zoho.com' }
      }
    }
  ])('rejects callback mismatch: $label', async ({ context }) => {
    let oauth = createZohoOauth(oauthOptions());

    await expectServiceError(oauth.handleCallback(context));
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it('rejects a callback region outside the integration subset', async () => {
    let oauth = createZohoOauth({
      supportedRegions: ['us', 'eu'],
      scopes,
      apiOrigins: { us: apiOrigins.us, eu: apiOrigins.eu }
    });

    await expectServiceError(oauth.handleCallback(callbackContext('multi_dc', 'in') as never));
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it('infers the callback region from accounts-server when location is omitted', async () => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse('eu') });
    let oauth = createZohoOauth(oauthOptions());

    let result = await oauth.handleCallback({
      ...callbackContext('multi_dc', 'eu'),
      callbackParams: { 'accounts-server': 'https://accounts.zoho.eu' }
    });

    expect(createAxios).toHaveBeenCalledWith({ baseURL: 'https://accounts.zoho.eu' });
    expect(result.output).toMatchObject({
      region: 'eu',
      accountsUrl: 'https://accounts.zoho.eu',
      apiDomain: apiOrigins.eu[0]
    });
  });

  it('infers the callback Accounts origin from location when accounts-server is omitted', async () => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse('in') });
    let oauth = createZohoOauth(oauthOptions());

    let result = await oauth.handleCallback({
      ...callbackContext('multi_dc', 'in'),
      callbackParams: { location: 'in' }
    });

    expect(createAxios).toHaveBeenCalledWith({ baseURL: 'https://accounts.zoho.in' });
    expect(result.output).toMatchObject({
      region: 'in',
      accountsUrl: 'https://accounts.zoho.in',
      apiDomain: apiOrigins.in[0]
    });
  });

  it('uses the selected regional Accounts origin when callback metadata is omitted', async () => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse('eu') });
    let oauth = createZohoOauth(oauthOptions());

    let result = await oauth.handleCallback({
      ...callbackContext('regional', 'eu', 'eu'),
      callbackParams: undefined
    });

    expect(createAxios).toHaveBeenCalledWith({ baseURL: 'https://accounts.zoho.eu' });
    expect(result.output).toMatchObject({
      applicationType: 'regional',
      region: 'eu',
      accountsUrl: 'https://accounts.zoho.eu'
    });
  });

  it('discovers a regionless multi-DC callback across supported Accounts origins', async () => {
    httpMocks.post
      .mockResolvedValueOnce({ data: { error: 'invalid_code' } })
      .mockResolvedValueOnce({ data: { error: 'invalid_client' } })
      .mockResolvedValueOnce({ data: tokenResponse('in') });
    let oauth = createZohoOauth({
      supportedRegions: ['us', 'eu', 'in'],
      scopes,
      apiOrigins: { us: apiOrigins.us, eu: apiOrigins.eu, in: apiOrigins.in }
    });

    let result = await oauth.handleCallback({
      ...callbackContext('multi_dc', 'in'),
      input: { applicationType: 'multi_dc' },
      callbackParams: {}
    });

    expect(vi.mocked(createAxios).mock.calls).toEqual([
      [{ baseURL: 'https://accounts.zoho.com' }],
      [{ baseURL: 'https://accounts.zoho.eu' }],
      [{ baseURL: 'https://accounts.zoho.in' }]
    ]);
    expect(result.output).toMatchObject({
      applicationType: 'multi_dc',
      region: 'in',
      accountsUrl: 'https://accounts.zoho.in',
      apiDomain: apiOrigins.in[0]
    });
  });

  it('fails clearly when callback metadata is omitted and no supported exchange succeeds', async () => {
    httpMocks.post.mockResolvedValue({ data: { error: 'invalid_code' } });
    let oauth = createZohoOauth({
      supportedRegions: ['us', 'eu'],
      scopes,
      apiOrigins: { us: apiOrigins.us, eu: apiOrigins.eu }
    });

    let error = await expectServiceError(
      oauth.handleCallback({
        ...callbackContext('multi_dc', 'us'),
        input: { applicationType: 'multi_dc' },
        callbackParams: undefined
      })
    );

    expect(httpMocks.post).toHaveBeenCalledTimes(2);
    expect(error.message).toContain('could not be exchanged in any supported data center');
  });

  it('does not retry region discovery after an upstream server failure', async () => {
    httpMocks.post.mockRejectedValue({
      response: { status: 503, data: { error: 'temporarily_unavailable' } }
    });
    let oauth = createZohoOauth({
      supportedRegions: ['us', 'eu'],
      scopes,
      apiOrigins: { us: apiOrigins.us, eu: apiOrigins.eu }
    });

    let error = await expectServiceError(
      oauth.handleCallback({
        ...callbackContext('multi_dc', 'us'),
        input: { applicationType: 'multi_dc' },
        callbackParams: undefined
      })
    );

    expect(httpMocks.post).toHaveBeenCalledTimes(1);
    expect(error.data.upstreamStatus).toBe(503);
  });

  it.each([
    'http://accounts.zoho.com',
    'https://user@accounts.zoho.com',
    'https://accounts.zoho.com:443',
    'https://accounts.zoho.com/',
    'https://accounts.zoho.com/oauth/v2/token',
    'https://accounts.zoho.com?next=https://evil.test',
    'https://accounts.zoho.com#evil',
    'https://accounts.zoho.com.evil.test'
  ])('rejects malicious or unsupported callback Accounts URL %s', async accountsServer => {
    let oauth = createZohoOauth(oauthOptions());

    await expectServiceError(
      oauth.handleCallback({
        ...callbackContext('multi_dc', 'us'),
        callbackParams: { location: 'us', 'accounts-server': accountsServer }
      })
    );
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'non-object response', data: null },
    { label: 'missing access token', data: { api_domain: apiOrigins.us[0] } },
    { label: 'blank access token', data: { access_token: '', api_domain: apiOrigins.us[0] } },
    {
      label: 'invalid expiry',
      data: { access_token: 'token', expires_in: 'later', api_domain: apiOrigins.us[0] }
    },
    { label: 'missing API domain', data: { access_token: 'token' } },
    {
      label: 'unapproved API domain',
      data: { access_token: 'token', api_domain: 'https://evil.test' }
    },
    {
      label: 'API domain for another region',
      data: { access_token: 'token', api_domain: apiOrigins.eu[0] }
    },
    {
      label: 'API domain with a path',
      data: { access_token: 'token', api_domain: `${apiOrigins.us[0]}/crm` }
    }
  ])('rejects invalid token data: $label', async ({ data }) => {
    httpMocks.post.mockResolvedValueOnce({ data });
    let extendOutput = vi.fn();
    let oauth = createZohoOauth(oauthOptions({ extendOutput }));

    await expectServiceError(oauth.handleCallback(callbackContext('multi_dc', 'us')));
    expect(extendOutput).not.toHaveBeenCalled();
  });

  it('converts upstream token-exchange failures to ServiceError', async () => {
    httpMocks.post.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'invalid_client' } }
    });
    let oauth = createZohoOauth(oauthOptions());

    let error = await expectServiceError(
      oauth.handleCallback(callbackContext('multi_dc', 'us'))
    );
    expect(error.data.upstreamStatus).toBe(401);
  });

  it('runs the output hook after validation with canonical inferred input', async () => {
    httpMocks.post.mockResolvedValueOnce({ data: tokenResponse('eu') });
    let extendOutput = vi.fn().mockResolvedValue({
      accountId: 'account-123',
      applicationType: 'regional',
      accountsUrl: 'https://evil.test',
      token: 'replaced-token'
    });
    let oauth = createZohoOauth(oauthOptions({ extendOutput }));

    let result = await oauth.handleCallback(callbackContext('multi_dc', 'eu'));

    expect(extendOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { applicationType: 'multi_dc', region: 'eu' },
        output: expect.objectContaining({
          applicationType: 'multi_dc',
          token: 'token-eu',
          region: 'eu',
          accountsUrl: 'https://accounts.zoho.eu'
        })
      })
    );
    expect(result.output).toMatchObject({
      accountId: 'account-123',
      applicationType: 'multi_dc',
      token: 'token-eu',
      accountsUrl: 'https://accounts.zoho.eu'
    });
  });

  it.each([
    undefined,
    ''
  ])('preserves the prior refresh token when Zoho returns %s', async replacementRefreshToken => {
    httpMocks.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access-token',
        refresh_token: replacementRefreshToken,
        expires_in: 1800
      }
    });
    let oauth = createZohoOauth(oauthOptions());
    let output = {
      token: 'old-access-token',
      refreshToken: 'stored-refresh-token',
      expiresAt: '2020-01-01T00:00:00.000Z',
      applicationType: 'multi_dc' as const,
      region: 'eu' as const,
      accountsUrl: ZOHO_REGION_METADATA.eu.accountsOrigin,
      apiDomain: apiOrigins.eu[0],
      accountId: 'account-123'
    };

    let result = await oauth.handleTokenRefresh({
      clientId: 'customer-client-id',
      clientSecret: 'customer-client-secret',
      scopes: [],
      input: { applicationType: 'multi_dc' },
      output
    });

    let [config, path, body] = httpMocks.post.mock.calls[0]!;
    expect(config).toEqual({ baseURL: ZOHO_REGION_METADATA.eu.accountsOrigin });
    expect(path).toBe('/oauth/v2/token');
    expect(new URLSearchParams(String(body))).toEqual(
      new URLSearchParams({
        client_id: 'customer-client-id',
        client_secret: 'customer-client-secret',
        refresh_token: 'stored-refresh-token',
        grant_type: 'refresh_token'
      })
    );
    expect(result.output).toMatchObject({
      token: 'new-access-token',
      refreshToken: 'stored-refresh-token',
      applicationType: 'multi_dc',
      region: 'eu',
      accountsUrl: ZOHO_REGION_METADATA.eu.accountsOrigin,
      apiDomain: apiOrigins.eu[0],
      accountId: 'account-123'
    });
  });

  it.each([
    {
      label: 'missing refresh token',
      input: { applicationType: 'multi_dc' },
      outputOverride: { refreshToken: undefined }
    },
    {
      label: 'missing application type',
      input: { applicationType: 'multi_dc' },
      outputOverride: { applicationType: undefined }
    },
    {
      label: 'mismatched application type',
      input: { applicationType: 'regional', region: 'us' },
      outputOverride: { applicationType: 'multi_dc' }
    },
    {
      label: 'regional input missing region',
      input: { applicationType: 'regional' },
      outputOverride: {}
    },
    {
      label: 'optional expected region mismatch',
      input: { applicationType: 'multi_dc', region: 'eu' },
      outputOverride: {}
    },
    {
      label: 'mismatched Accounts origin',
      input: { applicationType: 'multi_dc' },
      outputOverride: { accountsUrl: ZOHO_REGION_METADATA.eu.accountsOrigin }
    },
    {
      label: 'malicious stored API domain',
      input: { applicationType: 'multi_dc' },
      outputOverride: { apiDomain: 'https://evil.test' }
    }
  ])('rejects refresh with $label before making a request', async ({
    input,
    outputOverride
  }) => {
    let oauth = createZohoOauth(oauthOptions());
    let output = {
      token: 'old-token',
      refreshToken: 'refresh-token',
      applicationType: 'multi_dc',
      region: 'us',
      accountsUrl: ZOHO_REGION_METADATA.us.accountsOrigin,
      apiDomain: apiOrigins.us[0],
      ...outputOverride
    };

    await expectServiceError(
      oauth.handleTokenRefresh({
        clientId: 'customer-client-id',
        clientSecret: 'customer-client-secret',
        scopes: [],
        input: input as ZohoOauthInput,
        output: output as never
      })
    );
    expect(httpMocks.post).not.toHaveBeenCalled();
  });

  it('rejects an unapproved API domain returned during refresh', async () => {
    httpMocks.post.mockResolvedValueOnce({
      data: { access_token: 'new-token', api_domain: 'https://evil.test' }
    });
    let oauth = createZohoOauth(oauthOptions());

    await expectServiceError(
      oauth.handleTokenRefresh({
        clientId: 'customer-client-id',
        clientSecret: 'customer-client-secret',
        scopes: [],
        input: { applicationType: 'multi_dc' },
        output: {
          token: 'old-token',
          refreshToken: 'refresh-token',
          applicationType: 'multi_dc',
          region: 'us',
          accountsUrl: ZOHO_REGION_METADATA.us.accountsOrigin,
          apiDomain: apiOrigins.us[0]
        }
      })
    );
  });

  it('validates canonical output and canonicalizes inferred input before profile', async () => {
    let profile = vi.fn().mockResolvedValue({ id: 'user-123' });
    let oauth = createZohoOauth(oauthOptions({ profile }));
    if (!('getProfile' in oauth)) throw new Error('Expected getProfile hook');

    await expect(
      oauth.getProfile({
        input: { applicationType: 'multi_dc' },
        scopes: [],
        output: {
          token: 'token',
          applicationType: 'multi_dc',
          region: 'eu',
          accountsUrl: ZOHO_REGION_METADATA.eu.accountsOrigin,
          apiDomain: apiOrigins.eu[0]
        }
      })
    ).resolves.toEqual({ profile: { id: 'user-123' } });
    expect(profile).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { applicationType: 'multi_dc', region: 'eu' }
      })
    );
  });

  it('rejects inconsistent profile state before invoking the hook', async () => {
    let profile = vi.fn();
    let oauth = createZohoOauth(oauthOptions({ profile }));
    if (!('getProfile' in oauth)) throw new Error('Expected getProfile hook');

    await expectServiceError(
      oauth.getProfile({
        input: { applicationType: 'regional', region: 'us' },
        scopes: [],
        output: {
          token: 'token',
          applicationType: 'multi_dc',
          region: 'us',
          accountsUrl: ZOHO_REGION_METADATA.us.accountsOrigin,
          apiDomain: apiOrigins.us[0]
        }
      })
    );
    expect(profile).not.toHaveBeenCalled();
  });

  it('enforces profile region constraints before invoking the hook', async () => {
    let profile = vi.fn();
    let oauth = createZohoOauth(oauthOptions({ profile }));
    if (!('getProfile' in oauth)) throw new Error('Expected getProfile hook');

    await expectServiceError(
      oauth.getProfile({
        input: { applicationType: 'multi_dc', region: 'eu' },
        scopes: [],
        output: {
          token: 'token',
          applicationType: 'multi_dc',
          region: 'us',
          accountsUrl: ZOHO_REGION_METADATA.us.accountsOrigin,
          apiDomain: apiOrigins.us[0]
        }
      })
    );
    expect(profile).not.toHaveBeenCalled();
  });
});
