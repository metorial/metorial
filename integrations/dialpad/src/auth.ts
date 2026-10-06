import { createHash, randomBytes } from 'node:crypto';
import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  getApiErrorStatus,
  normalizeOAuthTokenResponse,
  pickDefined,
  SlateAuth,
  type SlateAuthWithOauth,
  type SlateAuthWithToken
} from 'slates';
import { z } from 'zod';
import { DialpadClient } from './lib/client';
import { credential, invalid, malformed, object, text } from './lib/contracts';
import { createDialpadAxios } from './lib/http';
import { user } from './lib/models';

type Output = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  environment: 'production' | 'sandbox';
};
const scopes = [
  { title: 'Calls List', description: 'Read completed call history', scope: 'calls:list' },
  {
    title: 'Offline Access',
    description: 'Refresh OAuth access without reconnecting',
    scope: 'offline_access'
  }
];
const origin = (environment: Output['environment']) =>
  environment === 'sandbox' ? 'https://sandbox.dialpad.com' : 'https://dialpad.com';
const profile = async (output: Output, environment: Output['environment']) => {
  if (output.environment !== environment)
    invalid('Reconnect with the matching Dialpad environment.');
  const mapped = user(await new DialpadClient(output).getUser('me'));
  return {
    profile: pickDefined({
      id: mapped.userId,
      email: mapped.emails?.[0],
      name:
        mapped.displayName ??
        ([mapped.firstName, mapped.lastName].filter(Boolean).join(' ') || undefined),
      imageUrl: mapped.imageUrl
    })
  };
};
async function exchange(
  environment: Output['environment'],
  data: Record<string, unknown>,
  previous?: string
): Promise<Output> {
  try {
    const response = await createDialpadAxios(
      {
        baseURL: origin(environment),
        timeout: 30000,
        maxRedirects: 0,
        maxBodyLength: 1024 * 1024,
        maxContentLength: 1024 * 1024
      },
      [data.client_secret, data.code, data.refresh_token].filter(
        (value): value is string => typeof value === 'string'
      ),
      true
    ).post<unknown>('/oauth2/token', data, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.status !== 200) malformed();
    const row = object(response.data);
    credential(row.access_token);
    if (row.refresh_token !== undefined && row.refresh_token !== null)
      credential(row.refresh_token);
    if (
      row.token_type !== undefined &&
      (typeof row.token_type !== 'string' || row.token_type.toLowerCase() !== 'bearer')
    )
      malformed();
    if (
      row.expires_in !== undefined &&
      row.expires_in !== null &&
      (typeof row.expires_in !== 'number' ||
        !Number.isSafeInteger(row.expires_in) ||
        row.expires_in <= 0 ||
        row.expires_in > (8640000000000000 - Date.now()) / 1000)
    )
      malformed();
    return {
      ...normalizeOAuthTokenResponse(row, {
        providerLabel: 'Dialpad',
        previousRefreshToken: previous,
        expiresInType: 'number'
      }),
      environment
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    const raw = getApiErrorStatus(error);
    const status =
      typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
        ? raw
        : undefined;
    throw buildApiServiceError(
      { response: { status } },
      {
        providerLabel: 'Dialpad',
        reason: 'dialpad_oauth_error',
        operation: 'token exchange',
        parent: {},
        extractMessage: () =>
          'Dialpad authorization could not be completed. Verify the environment and registered OAuth application, then reconnect.'
      }
    );
  }
}
export function createDialpadOauth(
  name: string,
  key: string,
  environment: Output['environment']
): SlateAuthWithOauth<Record<string, never>, Output> {
  return {
    type: 'auth.oauth',
    name,
    key,
    scopes,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.dialpad.com/docs/oauth'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const requested = ctx.scopes.length ? ctx.scopes : scopes.map(item => item.scope);
      if (requested.some(value => !scopes.some(item => item.scope === value)))
        invalid('Select the documented scopes needed by these tools.');
      const verifier = randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        client_id: text(ctx.clientId, 'OAuth client ID'),
        redirect_uri: text(ctx.redirectUri, 'OAuth redirect URI'),
        state: text(ctx.state, 'OAuth state'),
        response_type: 'code',
        scope: requested.join(' '),
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `${origin(environment)}/oauth2/authorize?${params}`,
        callbackState: { dialpadPkce: 1, environment, verifier }
      };
    },
    handleCallback: async ctx => {
      const state = ctx.callbackState ?? {};
      let verifier: string | undefined;
      if (state.dialpadPkce !== undefined) {
        if (
          state.dialpadPkce !== 1 ||
          state.environment !== environment ||
          typeof state.verifier !== 'string' ||
          !/^[A-Za-z0-9_-]{43}$/.test(state.verifier)
        )
          invalid('OAuth verification state is missing or changed. Restart authorization.');
        verifier = state.verifier;
      }
      return {
        output: await exchange(
          environment,
          pickDefined({
            client_id: text(ctx.clientId, 'OAuth client ID'),
            client_secret: credential(ctx.clientSecret),
            code: text(ctx.code, 'authorization code'),
            grant_type: 'authorization_code',
            redirect_uri: text(ctx.redirectUri, 'OAuth redirect URI'),
            code_verifier: verifier
          })
        )
      };
    },
    handleTokenRefresh: async ctx => {
      if (ctx.output.environment !== environment)
        invalid('Reconnect with the matching Dialpad environment.');
      const refresh = credential(ctx.output.refreshToken);
      return {
        output: await exchange(
          environment,
          {
            client_id: text(ctx.clientId, 'OAuth client ID'),
            client_secret: credential(ctx.clientSecret),
            refresh_token: refresh,
            grant_type: 'refresh_token'
          },
          refresh
        )
      };
    },
    getProfile: async ctx => profile(ctx.output, environment)
  };
}
function createDialpadApiKey(
  name: string,
  key: string,
  environment: Output['environment']
): SlateAuthWithToken<{ apiKey: string }, Output> {
  return {
    type: 'auth.token',
    name,
    key,
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'API key generated by a Dialpad company administrator; choose matching production or sandbox credentials.'
        )
    }),
    getOutput: async ctx => ({ output: { token: credential(ctx.input.apiKey), environment } }),
    getProfile: async ctx => profile(ctx.output, environment)
  };
}
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox'])
    })
  )
  .addOauth(createDialpadOauth('Production', 'oauth_production', 'production'))
  .addOauth(createDialpadOauth('Sandbox', 'oauth_sandbox', 'sandbox'))
  .addTokenAuth(
    createDialpadApiKey('API Key (Production)', 'api_key_production', 'production')
  )
  .addTokenAuth(createDialpadApiKey('API Key (Sandbox)', 'api_key_sandbox', 'sandbox'));
