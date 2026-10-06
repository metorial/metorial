import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { VimeoClient } from './lib/client';
import { apiFailure, invalid, parse, text } from './lib/native';

const stateSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
export type AuthState = z.output<typeof stateSchema>;
function accessToken(value: string) {
  text(value, 'access token', 8192);
  if (
    value.trim() !== value ||
    [...value].some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  )
    invalid('Provide a valid Vimeo access token without whitespace or control characters.');
  return value;
}
const profile = async (output: AuthState) => {
  const user = await new VimeoClient(accessToken(output.token)).getMe();
  return {
    profile: {
      id: user.uri.slice('/users/'.length),
      name: user.name,
      email: user.email,
      imageUrl: user.pictures?.sizes.at(-1)?.link
    }
  };
};
export const auth = SlateAuth.create()
  .output(stateSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Public',
        description: 'Read public metadata and authenticated identity',
        scope: 'public'
      },
      {
        title: 'Private',
        description: 'Read authorized private videos and library data',
        scope: 'private'
      },
      {
        title: 'Edit',
        description: 'Edit existing video and collection metadata',
        scope: 'edit'
      },
      {
        title: 'Delete',
        description: 'Delete authorized videos and collections',
        scope: 'delete'
      },
      { title: 'Interact', description: 'Like videos and post comments', scope: 'interact' },
      {
        title: 'Create',
        description: 'Create showcases, folders and channels',
        scope: 'create'
      },
      {
        title: 'Video Files',
        description: 'Retrieve native downloadable files with an eligible Vimeo membership',
        scope: 'video_files'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://api.vimeo.com/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: text(ctx.clientId, 'client ID'), redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => {
      const basic = Buffer.from(
        `${text(ctx.clientId, 'client ID')}:${text(ctx.clientSecret, 'client secret')}`
      ).toString('base64');
      const api = createAuthenticatedAxios({
        baseURL: 'https://api.vimeo.com',
        authHeader: { value: `Basic ${basic}` },
        headers: { Accept: 'application/vnd.vimeo.*+json;version=3.4' },
        timeout: 30_000,
        maxRedirects: 0,
        maxContentLength: 1024 * 1024,
        errorAdapter: apiFailure
      });
      const response = await api.post<unknown>('/oauth/access_token', {
        grant_type: 'authorization_code',
        code: text(ctx.code, 'authorization code'),
        redirect_uri: ctx.redirectUri
      });
      if (response.status !== 200)
        invalid(
          'Vimeo did not confirm the authorization-code exchange. Reconnect the account.',
          'oauth_token_response'
        );
      const data = parse(
        z
          .object({
            access_token: z.string().min(1),
            token_type: z.literal('bearer'),
            expires_in: z.number().optional(),
            expires_on: z.string().nullish(),
            refresh_token: z.string().nullish()
          })
          .passthrough(),
        response.data
      );
      const normalized = normalizeOAuthTokenResponse(data, {
        providerLabel: 'Vimeo',
        operation: 'authorization-code exchange'
      });
      if (
        data.expires_on !== undefined &&
        data.expires_on !== null &&
        !Number.isFinite(Date.parse(data.expires_on))
      )
        invalid(
          'Vimeo returned an invalid token expiration. Reconnect.',
          'oauth_token_response'
        );
      return {
        output: {
          token: accessToken(normalized.token),
          refreshToken: normalized.refreshToken,
          expiresAt: data.expires_on ?? normalized.expiresAt
        }
      };
    },
    handleTokenRefresh: async (ctx: { output: AuthState }) => {
      accessToken(ctx.output.token);
      if (
        ctx.output.expiresAt !== undefined &&
        (!Number.isFinite(Date.parse(ctx.output.expiresAt)) ||
          Date.parse(ctx.output.expiresAt) <= Date.now())
      )
        invalid(
          'This Vimeo token expired or has an invalid expiration. Vimeo does not currently support refresh tokens; reconnect using OAuth or an authenticated personal access token.',
          'reauthentication_required'
        );
      // Preserve legacy stored fields, but never invent an unsupported refresh-token grant.
      return { output: ctx.output };
    },
    getProfile: async (ctx: { output: AuthState }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Authenticated personal access token from the Vimeo developer portal; unauthenticated public-only app tokens cannot access /me or private libraries'
        )
    }),
    getOutput: async ctx => ({ output: { token: accessToken(ctx.input.token) } }),
    getProfile: async (ctx: { output: AuthState }) => profile(ctx.output)
  });
