import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { oracleOAuthError } from './lib/errors';
import { getOracleIdentityProfile } from './lib/identity';
import { requireRecord } from './lib/records';
import { normalizeHttpsOrigin } from './lib/urls';

let inputSchema = z.object({
  instanceUrl: z
    .string()
    .min(1)
    .describe(
      'Oracle Fusion Cloud HTTPS origin, such as https://example.fa.oraclecloud.com, without a path.'
    ),
  identityDomainUrl: z
    .string()
    .min(1)
    .describe(
      'OCI IAM identity-domain HTTPS origin associated with this Fusion instance, without a path.'
    ),
  resourceScope: z
    .string()
    .min(1)
    .describe(
      'Exact Fusion resource scope configured for this tenant in OCI IAM. Use the full audience and scope value from the Fusion Applications resource application.'
    )
});

export let oracleAuthOutputSchema = z.object({
  token: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.string(),
  instanceUrl: z.string(),
  identityDomainUrl: z.string(),
  resourceScope: z.string(),
  grantedScopes: z.array(z.string()),
  tokenType: z.literal('Bearer')
});
export type OracleFusionAuthOutput = z.infer<typeof oracleAuthOutputSchema>;
export type OracleFusionAuthInput = z.infer<typeof inputSchema>;
const IDENTITY_SCOPES = ['openid', 'profile', 'email', 'offline_access'];

let normalizeInput = (input: OracleFusionAuthInput): OracleFusionAuthInput => {
  if (
    typeof input.resourceScope !== 'string' ||
    !/^[\x21\x23-\x5b\x5d-\x7e]+$/.test(input.resourceScope) ||
    IDENTITY_SCOPES.includes(input.resourceScope)
  ) {
    throw createApiServiceError(
      'Resource scope must be the exact, nonempty Fusion Applications resource scope configured for this tenant.',
      { reason: 'oracle_fusion_invalid_scope' }
    );
  }
  return {
    instanceUrl: normalizeHttpsOrigin(input.instanceUrl, 'Oracle Fusion instance URL'),
    identityDomainUrl: normalizeHttpsOrigin(input.identityDomainUrl, 'Identity domain URL'),
    resourceScope: input.resourceScope
  };
};

let requestedScopes = (input: OracleFusionAuthInput, scopes: string[]) => [
  ...new Set([...IDENTITY_SCOPES, ...scopes, input.resourceScope])
];

let tokenRequest = async (
  operation: string,
  identityDomainUrl: string,
  clientId: string,
  clientSecret: string,
  params: URLSearchParams
) => {
  if (!clientId || !clientSecret || /[\r\n]/.test(clientId) || /[\r\n]/.test(clientSecret)) {
    throw createApiServiceError(
      'OAuth client credentials are missing or invalid. Configure a confidential client in the Oracle identity domain.',
      { reason: 'oracle_fusion_missing_oauth_client' }
    );
  }
  // RFC 6749 requires form-encoding each credential before client_secret_basic.
  let encodeCredential = (value: string) =>
    new URLSearchParams({ value }).toString().slice('value='.length);
  let basic = Buffer.from(
    `${encodeCredential(clientId)}:${encodeCredential(clientSecret)}`
  ).toString('base64');
  let http = createAxios({
    baseURL: identityDomainUrl,
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    maxRedirects: 0,
    timeout: 30000
  });
  return requestAxiosData<unknown>(
    operation,
    () => http.post('/oauth2/v1/token', params.toString()),
    oracleOAuthError
  );
};

let normalizeTokens = (
  value: unknown,
  input: OracleFusionAuthInput,
  scopes: string[],
  previous?: OracleFusionAuthOutput
): OracleFusionAuthOutput => {
  let data = requireRecord(value, 'OAuth token response');
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  ) {
    throw createApiServiceError('Oracle identity domain returned an unsupported token type.', {
      reason: 'oracle_fusion_invalid_token_response'
    });
  }
  let seconds =
    typeof data.expires_in === 'number'
      ? data.expires_in
      : typeof data.expires_in === 'string' && data.expires_in.trim()
        ? Number(data.expires_in)
        : Number.NaN;
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(Date.now() + seconds * 1000) ||
    Date.now() + seconds * 1000 > 8640000000000000
  ) {
    throw createApiServiceError(
      'Oracle identity domain did not return a valid token expiry.',
      { reason: 'oracle_fusion_invalid_token_response' }
    );
  }
  let tokens = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Oracle identity domain',
    operation: previous ? 'token refresh' : 'token exchange',
    required: true,
    previousRefreshToken: previous?.refreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
  if (
    !tokens.expiresAt ||
    !tokens.refreshToken ||
    !/^[\x21-\x7e]+$/.test(tokens.token) ||
    !/^[\x21-\x7e]+$/.test(tokens.refreshToken)
  ) {
    throw createApiServiceError(
      'Oracle identity domain did not return valid access and refresh tokens. Enable offline access for this confidential application and reconnect.',
      { reason: 'oracle_fusion_invalid_token_response' }
    );
  }
  let grantedScopes = previous?.grantedScopes ?? scopes;
  if (data.scope !== undefined) {
    if (typeof data.scope !== 'string' || !data.scope.trim()) {
      throw createApiServiceError(
        'Oracle identity domain returned an invalid granted scope value.',
        { reason: 'oracle_fusion_invalid_token_response' }
      );
    }
    grantedScopes = [...new Set(data.scope.trim().split(/\s+/))];
  }
  return {
    ...input,
    token: tokens.token,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    tokenType: 'Bearer',
    grantedScopes
  };
};

export let auth = SlateAuth.create()
  .output(oracleAuthOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'Oracle Identity Domain OAuth',
    key: 'oauth',
    inputSchema,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Fusion Applications OAuth setup',
        url: 'https://docs.oracle.com/en/cloud/saas/applications-common/26c/farca/configure_oauth.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Oracle identity scopes',
        url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/api-getstarted/usingopenidconnect.htm'
      }
    ],
    scopes: [
      {
        title: 'OpenID',
        scope: 'openid',
        description: 'Identify the authenticated Oracle user.'
      },
      {
        title: 'Profile',
        scope: 'profile',
        description: 'Read the authenticated user profile.'
      },
      { title: 'Email', scope: 'email', description: 'Read the authenticated user email.' },
      {
        title: 'Offline Access',
        scope: 'offline_access',
        description: 'Refresh access after the access token expires.'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let input = normalizeInput(ctx.input);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: requestedScopes(input, ctx.scopes).join(' ')
      });
      return {
        url: `${input.identityDomainUrl}/oauth2/v1/authorize?${params.toString()}`,
        input
      };
    },
    handleCallback: async ctx => {
      let input = normalizeInput(ctx.input);
      if (!ctx.code)
        throw createApiServiceError(
          'The Oracle authorization callback did not include an authorization code. Reconnect the account.',
          { reason: 'oracle_fusion_missing_authorization_code' }
        );
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      let data = await tokenRequest(
        'OAuth token exchange',
        input.identityDomainUrl,
        ctx.clientId,
        ctx.clientSecret,
        params
      );
      let output = normalizeTokens(data, input, requestedScopes(input, ctx.scopes));
      return { output, input, scopes: output.grantedScopes };
    },
    handleTokenRefresh: async ctx => {
      let input = normalizeInput(ctx.output);
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'No Oracle refresh token is available. Reconnect the account with offline access.',
          { reason: 'oracle_fusion_missing_refresh_token' }
        );
      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });
      let data = await tokenRequest(
        'OAuth token refresh',
        input.identityDomainUrl,
        ctx.clientId,
        ctx.clientSecret,
        params
      );
      return {
        output: normalizeTokens(data, input, requestedScopes(input, ctx.scopes), ctx.output)
      };
    },
    getProfile: async ctx => ({ profile: await getOracleIdentityProfile(ctx.output) })
  } satisfies SlateAuthWithOauth<OracleFusionAuthInput, OracleFusionAuthOutput>);
