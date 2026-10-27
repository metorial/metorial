import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from './lib/client';
import { highLevelApiError } from './lib/errors';
import {
  HIGHLEVEL_PRIVATE_TOKEN_SCOPE,
  highLevelOAuthScopes,
  requireHighLevelScope
} from './lib/scopes';

const outputSchema = z.object({
  token: z.string().min(1),
  authType: z.enum(['oauth', 'private_token']),
  locationId: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  companyId: z.string().optional(),
  userId: z.string().optional(),
  redirectUri: z.string().optional()
});

export type HighLevelAuthOutput = z.infer<typeof outputSchema>;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
  userType: z.string().optional(),
  locationId: z.string().min(1).optional(),
  companyId: z.string().optional(),
  userId: z.string().optional(),
  isBulkInstallation: z.boolean().optional()
});

const oauthApi = createAxios({
  baseURL: 'https://services.leadconnectorhq.com',
  timeout: 30_000,
  maxRedirects: 0,
  validateStatus: () => true,
  headers: { Version: 'v3', Accept: 'application/json' }
});

const requestToken = async (params: URLSearchParams, operation: string) => {
  const secrets = [
    params.get('client_secret'),
    params.get('code'),
    params.get('refresh_token')
  ].filter((value): value is string => !!value);
  const response = await requestAxios<unknown>(
    operation,
    () =>
      oauthApi.post('/oauth/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }),
    (error, action) => highLevelApiError(error, action, secrets)
  );
  if (response.status < 200 || response.status >= 300) {
    throw highLevelApiError({ response }, operation, secrets);
  }
  const parsed = tokenSchema.safeParse(response.data);
  if (!parsed.success) {
    throw createApiServiceError(
      'HighLevel returned an invalid OAuth token response. Reconnect the sub-account.',
      { reason: 'highlevel_invalid_token_response' }
    );
  }
  return parsed.data;
};

const normalizeToken = (
  data: z.infer<typeof tokenSchema>,
  redirectUri: string | undefined,
  previous?: HighLevelAuthOutput
): HighLevelAuthOutput => {
  if (
    data.isBulkInstallation === true ||
    (data.userType !== undefined && data.userType !== 'Location') ||
    (!previous && (data.userType !== 'Location' || !data.locationId))
  ) {
    throw createApiServiceError(
      'Connect one HighLevel sub-account using a Location installation. Agency and bulk installations are not supported; reconnect and select a single sub-account.',
      { reason: 'highlevel_unsupported_installation' }
    );
  }
  if (
    previous &&
    ((data.locationId !== undefined && data.locationId !== previous.locationId) ||
      (data.companyId !== undefined &&
        previous.companyId !== undefined &&
        data.companyId !== previous.companyId))
  ) {
    throw createApiServiceError(
      'HighLevel refreshed credentials for a different account. Reconnect the original sub-account.',
      { reason: 'highlevel_account_mismatch' }
    );
  }
  const locationId = data.locationId ?? previous?.locationId;
  if (!locationId) {
    throw createApiServiceError('HighLevel did not identify a connected sub-account.', {
      reason: 'highlevel_missing_location'
    });
  }
  const normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'HighLevel',
    operation: previous ? 'refresh' : 'token exchange',
    previousRefreshToken: previous?.refreshToken,
    required: true,
    expiresInType: 'number'
  });
  if (!normalized.refreshToken) {
    throw createApiServiceError(
      'HighLevel did not return a refresh token. Reconnect the sub-account to enable automatic renewal.',
      { reason: 'highlevel_missing_refresh_token' }
    );
  }
  const output: HighLevelAuthOutput = {
    ...normalized,
    authType: 'oauth',
    locationId,
    scopes:
      data.scope !== undefined
        ? [...new Set(data.scope.split(/\s+/).filter(Boolean))]
        : (previous?.scopes ?? []),
    companyId: data.companyId ?? previous?.companyId,
    userId: data.userId ?? previous?.userId,
    redirectUri: redirectUri ?? previous?.redirectUri
  };
  // A successful refresh consumes the old refresh token. Persist the new pair
  // even if grants changed; subsequent actions check the returned permissions.
  if (!previous) requireHighLevelScope(output, 'locations.readonly');
  return output;
};

const locationSchema = z.object({
  location: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    email: z.string().optional(),
    logoUrl: z.string().optional(),
    companyId: z.string().optional()
  })
});

const getLocationProfile = async (output: HighLevelAuthOutput) => {
  const data = await createHighLevelClient(output).request<unknown>({
    method: 'GET',
    path: `/locations/${encodeURIComponent(output.locationId)}`,
    scope: 'locations.readonly'
  });
  const parsed = locationSchema.safeParse(data);
  if (
    !parsed.success ||
    parsed.data.location.id !== output.locationId ||
    (output.companyId !== undefined &&
      parsed.data.location.companyId !== undefined &&
      parsed.data.location.companyId !== output.companyId)
  ) {
    throw createApiServiceError(
      'The credential could not be verified for the selected HighLevel sub-account. Check the token, its locations.readonly permission, and the sub-account URL.',
      { reason: 'highlevel_account_mismatch' }
    );
  }
  const location = parsed.data.location;
  return {
    id: location.id,
    name: location.name ?? 'HighLevel sub-account',
    email: location.email,
    imageUrl: location.logoUrl,
    locationId: location.id,
    companyId: location.companyId
  };
};

const locationFromAccountUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(
      'Enter the complete HTTPS URL of your HighLevel sub-account dashboard.',
      { reason: 'highlevel_invalid_account_url' }
    );
  }
  const match = url.pathname.match(/(?:^|\/)location\/([A-Za-z0-9_-]+)(?:\/|$)/);
  if (url.protocol !== 'https:' || url.username || url.password || !match?.[1]) {
    throw createApiServiceError(
      'Enter the HTTPS sub-account dashboard URL containing /location/<locationId>. Open the intended sub-account and copy its URL.',
      { reason: 'highlevel_invalid_account_url' }
    );
  }
  // Only the identifier is used. The supplied host is never contacted.
  return match[1];
};

export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth',
    name: 'OAuth for one sub-account',
    scopes: highLevelOAuthScopes,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'HighLevel OAuth setup',
        url: 'https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'HighLevel permissions',
        url: 'https://marketplace.gohighlevel.com/docs/Authorization/Scopes/'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const scopes = [...new Set([...ctx.scopes, 'locations.readonly'])];
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: scopes.join(' '),
        state: ctx.state
      });
      return { url: `https://marketplace.gohighlevel.com/oauth/chooselocation?${params}` };
    },
    handleCallback: async ctx => {
      const data = await requestToken(
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          user_type: 'Location'
        }),
        'OAuth token exchange'
      );
      const output = normalizeToken(data, ctx.redirectUri);
      const profile = await getLocationProfile(output);
      output.companyId = profile.companyId ?? output.companyId;
      return { output, scopes: output.scopes };
    },
    handleTokenRefresh: async (ctx: {
      output: HighLevelAuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (ctx.output.authType !== 'oauth' || !ctx.output.refreshToken) {
        throw createApiServiceError(
          'Reconnect HighLevel: no OAuth refresh token is available.',
          {
            reason: 'highlevel_missing_refresh_token'
          }
        );
      }
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        user_type: 'Location'
      });
      if (ctx.output.redirectUri) params.set('redirect_uri', ctx.output.redirectUri);
      const data = await requestToken(params, 'OAuth token refresh');
      // Persist the rotated credentials before a future profile/API request can fail.
      return { output: normalizeToken(data, ctx.output.redirectUri, ctx.output) };
    },
    getProfile: async (ctx: { output: HighLevelAuthOutput }) => ({
      profile: await getLocationProfile(ctx.output)
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    key: 'private_token',
    name: 'Sub-account Private Integration Token',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'Find the sub-account in your dashboard URL',
        url: 'https://help.gohighlevel.com/support/solutions/articles/48001204848-how-do-i-find-my-client-s-location-id-'
      }
    ],
    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Private Integration Token created in the intended sub-account settings, including locations.readonly and the permissions needed by your actions. Agency tokens are not supported.'
        ),
      subAccountUrl: z
        .string()
        .url()
        .describe(
          'HTTPS dashboard URL copied while viewing the intended sub-account, containing /location/<locationId>.'
        )
    }),
    getOutput: async ctx => {
      const output: HighLevelAuthOutput = {
        token: ctx.input.token,
        authType: 'private_token',
        locationId: locationFromAccountUrl(ctx.input.subAccountUrl)
      };
      const profile = await getLocationProfile(output);
      output.companyId = profile.companyId;
      return { output, scopes: [HIGHLEVEL_PRIVATE_TOKEN_SCOPE] };
    },
    getProfile: async (ctx: { output: HighLevelAuthOutput }) => ({
      profile: await getLocationProfile(ctx.output)
    })
  });
