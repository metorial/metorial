import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { vercelApiError, vercelServiceError } from './lib/errors';

let axiosInstance = createAxios({ baseURL: 'https://api.vercel.com' });

let requestVercelAuth = async <T>(operation: string, run: () => Promise<{ data: T }>) => {
  try {
    return (await run()).data;
  } catch (error) {
    throw vercelApiError(error, operation);
  }
};

let getProfile = async (ctx: { output: { token: string; teamId?: string } }) => {
  let data = await requestVercelAuth<{
    user?: {
      id?: string;
      uid?: string;
      email: string;
      name?: string;
      username: string;
      avatar?: string;
    };
  }>('get profile', () =>
    axiosInstance.get('/v2/user', {
      headers: { Authorization: `Bearer ${ctx.output.token}` },
      params: { teamId: ctx.output.teamId }
    })
  );
  let user = data.user;
  let userId = user?.id ?? user?.uid;
  if (!user || !userId) {
    throw vercelServiceError('Vercel profile response did not include a user.');
  }
  return {
    profile: {
      id: userId,
      email: user.email,
      name: user.name || user.username,
      imageUrl: user.avatar ? `https://api.vercel.com/www/avatar/${user.avatar}` : undefined,
      username: user.username
    }
  };
};

let authOutputSchema = z.object({
  token: z.string(),
  teamId: z.string().optional(),
  installationId: z.string().optional(),
  // Retain the old output shape for stored connections; reconnect to migrate them.
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'Vercel OAuth',
    key: 'oauth',
    inputSchema: z.object({
      teamSlug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional()
        .describe(
          'Team URL slug for installing a private integration, from vercel.com/<team-slug>. Leave empty for the public installation page.'
        ),
      integrationSlug: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .describe(
          'URL slug of your app in the Vercel Integrations Console. Use its matching client ID and secret, and register the callback URL as its Redirect URL.'
        )
    }),
    // Integration permissions are configured in the Vercel Integrations Console.
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let slug = encodeURIComponent(ctx.input.integrationSlug);
      let path = ctx.input.teamSlug
        ? `/${encodeURIComponent(ctx.input.teamSlug)}/~/integrations/${slug}`
        : `/integrations/${slug}/new`;
      return { url: `https://vercel.com${path}?${new URLSearchParams({ state: ctx.state })}` };
    },
    handleCallback: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      let data = await requestVercelAuth<{
        access_token?: string;
        team_id?: string | null;
        installation_id?: string;
      }>('exchange OAuth code', () =>
        axiosInstance.post('/v2/oauth/access_token', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
      let { token } = normalizeOAuthTokenResponse(data, { providerLabel: 'Vercel' });
      return {
        output: {
          token,
          teamId: data.team_id ?? undefined,
          installationId: data.installation_id
        }
      };
    },
    // Integration tokens are long-lived and have no refresh grant. Legacy Sign in
    // tokens must be reconnected with an Integrations Console client.
    handleTokenRefresh: async (ctx: { output: z.infer<typeof authOutputSchema> }) => {
      if (ctx.output.refreshToken || ctx.output.expiresAt) {
        throw vercelServiceError(
          'Reconnect Vercel OAuth using a client from the Integrations Console. Sign in with Vercel credentials cannot be refreshed by this integration.'
        );
      }
      return { output: ctx.output };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z.string().describe('Vercel Access Token (Bearer token)')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile
  });
