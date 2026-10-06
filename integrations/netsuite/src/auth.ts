import { createHash, randomBytes } from 'node:crypto';
import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { account, credential, guard, object, requireValue, upstream } from './lib/contracts';

async function exchange(
  accountId: string,
  clientId: string,
  clientSecret: string,
  body: Record<string, string>,
  previousRefreshToken?: string
) {
  credential(clientId);
  credential(clientSecret);
  const http = createAuthenticatedAxios({
    baseURL: `https://${account(accountId).host}.suitetalk.api.netsuite.com`,
    authHeader: {
      value: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64url')}`
    },
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 1024 * 1024,
    errorMapping: {
      mapAxiosError: () => ({
        message:
          'NetSuite authorization failed. Reauthorize with the correct account and enabled integration.'
      })
    },
    errorAdapter: upstream
  });
  try {
    const response = await http.post(
      '/services/rest/auth/oauth2/v1/token',
      new URLSearchParams(body).toString()
    );
    requireValue(
      response.status === 200,
      'NetSuite did not return the documented token response. Reauthorize before retrying.'
    );
    object(response.data);
    const { access_token, refresh_token, ...other } = response.data;
    guard(
      { other, headers: response.headers, statusText: response.statusText },
      [
        clientSecret,
        ...Object.values(body),
        ...[access_token, refresh_token, previousRefreshToken].filter(
          (s): s is string => typeof s === 'string'
        )
      ].filter(s => s !== body.grant_type && s !== body.redirect_uri)
    );
    credential(access_token);
    requireValue(
      response.data.token_type === 'bearer' && response.data.expires_in === 3600,
      'NetSuite token type or expiry does not match its documented response.'
    );
    if (refresh_token !== undefined) credential(refresh_token);
    const normalized = normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'NetSuite',
      required: true,
      expiresInType: 'number',
      previousRefreshToken
    });
    credential(normalized.refreshToken);
    return { ...normalized, accountId: account(accountId).realm, authType: 'oauth2' as const };
  } catch (error) {
    throw upstream(error);
  }
}
export const outputSchema = z.object({
  token: z.string().describe('OAuth access token or TBA token identifier'),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  accountId: z
    .string()
    .optional()
    .describe(
      'Original authenticated account ID; missing legacy state requires the saved account configuration'
    ),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
  tokenId: z.string().optional(),
  tokenSecret: z.string().optional(),
  authType: z.enum(['oauth2', 'tba'])
});
type RefreshContext = {
  output: z.infer<typeof outputSchema>;
  input: { accountId: string };
  clientId: string;
  clientSecret: string;
};
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    scopes: [
      {
        title: 'REST Web Services',
        description:
          'Record metadata, record operations and SuiteQL permitted by the selected native role.',
        scope: 'rest_webservices'
      }
    ],
    inputSchema: z.object({
      accountId: z
        .string()
        .describe(
          'Account ID from Company Information, such as 1234567 or 1234567_SB1; the account-specific domain form is also accepted.'
        )
    }),
    getAuthorizationUrl: async ctx => {
      const bound = account(ctx.input.accountId);
      credential(ctx.clientId);
      requireValue(
        ctx.state.length >= 22 &&
          ctx.state.length <= 1024 &&
          [...ctx.state].every(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126),
        'A valid unique authorization state is required. Restart connection setup.'
      );
      requireValue(
        ctx.scopes.length === 1 && ctx.scopes[0] === 'rest_webservices',
        'This connection requests only the REST Web Services scope.'
      );
      const verifier = randomBytes(48).toString('base64url');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://${bound.host}.app.netsuite.com/app/login/oauth2/authorize.nl?${params}`,
        input: { accountId: bound.realm },
        callbackState: { verifier, accountId: bound.realm, state: ctx.state }
      };
    },
    handleCallback: async ctx => {
      const bound = account(ctx.input.accountId),
        saved = ctx.callbackState;
      requireValue(
        saved?.accountId === bound.realm &&
          saved.state === ctx.state &&
          typeof saved.verifier === 'string' &&
          /^[A-Za-z0-9._~-]{43,128}$/.test(saved.verifier),
        'Original authorization account/state is missing or changed. Restart connection setup.'
      );
      if (ctx.callbackParams?.company !== undefined)
        requireValue(
          account(ctx.callbackParams.company).realm === bound.realm,
          'NetSuite authorized a different account. Restart setup for the intended account.'
        );
      credential(ctx.code);
      return {
        output: await exchange(bound.realm, ctx.clientId, ctx.clientSecret, {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: saved.verifier
        }),
        input: { accountId: bound.realm }
      };
    },
    handleTokenRefresh: async (ctx: RefreshContext) => {
      requireValue(
        ctx.output.authType === 'oauth2',
        'Only the original OAuth connection can refresh this token.'
      );
      credential(ctx.output.refreshToken);
      const bound = account(ctx.output.accountId ?? ctx.input.accountId);
      return {
        output: await exchange(
          bound.realm,
          ctx.clientId,
          ctx.clientSecret,
          { grant_type: 'refresh_token', refresh_token: ctx.output.refreshToken },
          ctx.output.refreshToken
        ),
        input: { accountId: bound.realm }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Token-Based Authentication (TBA)',
    key: 'tba',
    inputSchema: z.object({
      accountId: z
        .string()
        .describe(
          'Original NetSuite account ID, including its sandbox or Release Preview suffix.'
        ),
      consumerKey: z.string().describe('Integration consumer key'),
      consumerSecret: z.string().describe('Integration consumer secret'),
      tokenId: z.string().describe('Role-bound access token identifier'),
      tokenSecret: z.string().describe('Role-bound access token secret')
    }),
    getOutput: async ctx => {
      for (const value of [
        ctx.input.consumerKey,
        ctx.input.consumerSecret,
        ctx.input.tokenId,
        ctx.input.tokenSecret
      ])
        credential(value);
      return {
        output: {
          ...ctx.input,
          accountId: account(ctx.input.accountId).realm,
          token: ctx.input.tokenId,
          authType: 'tba' as const
        }
      };
    }
  });
