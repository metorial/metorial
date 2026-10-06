import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { StoryblokClient } from './lib/client';
import { getOAuthBaseUrl, type Region } from './lib/regions';
import { id, integer, own, token, upstreamError } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  region: z.enum(['eu', 'us', 'ca', 'ap', 'cn']),
  mode: z.enum(['pat', 'oauth']).optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  spaceId: z.string().optional(),
  callbackRedirectUri: z.string().optional()
});
type Output = z.infer<typeof outputSchema>;
const scopes = [
  {
    title: 'Read Content',
    description: 'Read content in the authorized plugin space.',
    scope: 'read_content'
  },
  {
    title: 'Write Content',
    description:
      'Write content in the authorized plugin space; additional management endpoints depend on provider permissions.',
    scope: 'write_content'
  }
];
function tokenOutput(
  data: unknown,
  region: Region,
  spaceId: string,
  previousRefreshToken?: string
): Output {
  const access = token(own(data, 'access_token'));
  const type = own(data, 'token_type');
  if (typeof type !== 'string' || type.toLowerCase() !== 'bearer')
    throw createApiServiceError(
      'Storyblok did not return a supported bearer token. Reconnect the plugin.',
      { reason: 'oauth_token_response' }
    );
  const expires = integer(own(data, 'expires_in'), 'expires_in', 1, 365 * 24 * 3600);
  const refresh = own(data, 'refresh_token');
  if (refresh !== undefined && refresh !== null) token(refresh);
  const normalized = normalizeOAuthTokenResponse(
    { access_token: access, refresh_token: refresh, expires_in: expires },
    { providerLabel: 'Storyblok', required: true, previousRefreshToken }
  );
  return { ...normalized, region, mode: 'oauth', spaceId };
}
async function profile(output: Output, region: Region, methodMode: 'pat' | 'oauth') {
  if (output.region !== region || (output.mode !== undefined && output.mode !== methodMode))
    throw createApiServiceError('Reconnect using the matching regional credential method.', {
      reason: 'invalid_auth'
    });
  // Legacy stored outputs retain their original raw header/current-user behavior.
  const user = await new StoryblokClient(output).getCurrentUser();
  return {
    profile: {
      id: String(user.id),
      name:
        user.friendly_name ??
        ([user.firstname, user.lastname].filter(Boolean).join(' ') || undefined),
      email: user.email ?? user.real_email,
      imageUrl: user.avatar
    }
  };
}
function createStoryblokOauth(
  name: string,
  key: string,
  region: Region
): SlateAuthWithOauth<Record<string, never>, Output> {
  const http = () =>
    createAuthenticatedAxios({
      baseURL: getOAuthBaseUrl(region),
      timeout: 15000,
      maxRedirects: 0,
      maxContentLength: 65536,
      maxBodyLength: 65536,
      errorAdapter: upstreamError
    });
  return {
    type: 'auth.oauth',
    name,
    key,
    scopes,
    getAuthorizationUrl: async ctx => {
      const verifier = randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://app.storyblok.com/oauth/authorize?${params}`,
        callbackState: { verifier, region }
      };
    },
    handleCallback: async ctx => {
      const verifier = own(ctx.callbackState, 'verifier');
      if (
        typeof verifier !== 'string' ||
        !/^[A-Za-z0-9_-]{43,128}$/.test(verifier) ||
        own(ctx.callbackState, 'region') !== region
      )
        throw createApiServiceError(
          'Restart Storyblok authorization; the callback state is missing or belongs to another region.',
          { reason: 'oauth_state' }
        );
      const spaceId = id(ctx.callbackParams?.space_id, 'authorized callback space_id');
      const response = await http().post<unknown>('/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code_verifier: verifier
      });
      if (response.status !== 200)
        throw createApiServiceError(
          'Storyblok did not confirm token exchange. Restart authorization.',
          { reason: 'oauth_token_response' }
        );
      const output = {
        ...tokenOutput(response.data, region, spaceId),
        callbackRedirectUri: ctx.redirectUri
      };
      const discovery = await new StoryblokClient(output).listSpaces();
      if (discovery.spaces[0]?.id !== Number(spaceId))
        throw createApiServiceError(
          'Storyblok did not verify the authorized space. Restart authorization.',
          { reason: 'space_binding' }
        );
      return { output };
    },
    handleTokenRefresh: async ctx => {
      if (!ctx.output.refreshToken || !ctx.output.spaceId || !ctx.output.callbackRedirectUri)
        throw createApiServiceError(
          'Reconnect Storyblok OAuth to obtain refresh state and a verified plugin space.',
          { reason: 'oauth_reconnect' }
        );
      if (
        ctx.output.region !== region ||
        (ctx.output.mode !== undefined && ctx.output.mode !== 'oauth')
      )
        throw createApiServiceError('Reconnect with the matching regional OAuth method.', {
          reason: 'invalid_auth'
        });
      const response = await http().post<unknown>('/token', {
        grant_type: 'refresh_token',
        refresh_token: token(ctx.output.refreshToken),
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.output.callbackRedirectUri
      });
      if (response.status !== 200)
        throw createApiServiceError(
          'Storyblok did not confirm token refresh. Reconnect before retrying.',
          { reason: 'oauth_token_response' }
        );
      return {
        output: {
          ...tokenOutput(
            response.data,
            region,
            id(ctx.output.spaceId, 'authorized spaceId'),
            ctx.output.refreshToken
          ),
          callbackRedirectUri: ctx.output.callbackRedirectUri
        }
      };
    },
    getProfile: ctx => profile(ctx.output, region, 'oauth')
  };
}
function createStoryblokPat(name: string, key: string, region: Region) {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Management Personal Access Token from account settings; Content Delivery API tokens do not authenticate this integration.'
        )
    }),
    getOutput: async (ctx: { input: { token: string } }) => ({
      output: { token: token(ctx.input.token), region, mode: 'pat' as const }
    }),
    getProfile: (ctx: { output: Output }) => profile(ctx.output, region, 'pat')
  };
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(createStoryblokOauth('Europe (EU)', 'oauth_eu', 'eu'))
  .addOauth(createStoryblokOauth('United States (US)', 'oauth_us', 'us'))
  .addOauth(createStoryblokOauth('Canada (CA)', 'oauth_ca', 'ca'))
  .addOauth(createStoryblokOauth('Asia-Pacific (AP)', 'oauth_ap', 'ap'))
  .addOauth(createStoryblokOauth('China (CN)', 'oauth_cn', 'cn'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (EU)', 'pat_eu', 'eu'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (US)', 'pat_us', 'us'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (CA)', 'pat_ca', 'ca'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (AP)', 'pat_ap', 'ap'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (CN)', 'pat_cn', 'cn'));
