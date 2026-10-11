import { createHash, randomBytes } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { RoboflowClient } from './lib/client';

let authOutputSchema = z.object({
  token: z.string(),
  workspaceId: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});

let oauthClient = createAuthenticatedAxios({
  baseURL: 'https://app.roboflow.com',
  contentType: 'application/x-www-form-urlencoded',
  maxRedirects: 0,
  timeout: 30_000,
  // Reports the status and OAuth error code without echoing request credentials.
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Roboflow',
      operation: 'OAuth token exchange',
      reason: 'roboflow_oauth_error',
      detailKeys: ['error_description', 'error', 'message'],
      extractUpstreamCode: (_error, response) =>
        isApiErrorRecord(response?.data) && typeof response.data.error === 'string'
          ? response.data.error
          : undefined
    })
});

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Roboflow Private API Key. Found under Settings > API Keys in your Roboflow dashboard.'
        )
    }),

    getOutput: async ctx => {
      let workspaceId = await new RoboflowClient({
        token: ctx.input.token
      }).getAuthenticatedWorkspace();
      return {
        output: {
          token: ctx.input.token,
          workspaceId
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; workspaceId?: string } }) => {
      let workspaceId =
        ctx.output.workspaceId ??
        (await new RoboflowClient(ctx.output).getAuthenticatedWorkspace());

      return {
        profile: {
          id: workspaceId,
          name: workspaceId
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    inputSchema: z.object({}),
    scopes: (
      [
        ['openid', 'Identify your account'],
        ['offline_access', 'Keep your account connected'],
        ['workspace:read', 'Read workspace and list projects'],
        ['project:create', 'Create projects'],
        ['project:read', 'Read projects'],
        ['image:create', 'Upload images'],
        ['image:read', 'Read and search images'],
        ['image:tag', 'Manage image tags'],
        ['image:annotate', 'Upload annotations'],
        ['version:create', 'Generate dataset versions'],
        ['version:read', 'Read and export dataset versions'],
        ['training-job:create', 'Start training jobs'],
        ['annotation-job:create', 'Create annotation jobs'],
        ['annotation-job:read', 'Read annotation jobs'],
        ['batch:read', 'List image batches'],
        ['model:infer', 'Run model inference']
      ] as const
    ).map(([scope, title]) => ({ scope, title, description: title })),
    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(32).toString('base64url');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://app.roboflow.com/oauth/authorize?${params}`,
        callbackState: { codeVerifier, state: ctx.state, redirectUri: ctx.redirectUri }
      };
    },
    handleCallback: async ctx => {
      let saved = z
        .object({
          codeVerifier: z.string().min(43).max(128),
          state: z.string(),
          redirectUri: z.string()
        })
        .safeParse(ctx.callbackState);
      if (
        !saved.success ||
        saved.data.state !== ctx.state ||
        saved.data.redirectUri !== ctx.redirectUri
      ) {
        throw createApiServiceError(
          'Roboflow OAuth callback is invalid. Reconnect your account.'
        );
      }
      if (ctx.callbackParams?.error || !ctx.code) {
        throw createApiServiceError(
          'Roboflow authorization was denied or canceled. Reconnect to grant access.'
        );
      }
      let tokens = await exchangeToken(
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: saved.data.codeVerifier
        })
      );
      let workspaceId = await new RoboflowClient(tokens).getAuthenticatedWorkspace();
      return { output: { ...tokens, workspaceId } };
    },
    handleTokenRefresh: async ctx => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Roboflow refresh token is missing. Reconnect your account.'
        );
      }
      let tokens = await exchangeToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }),
        ctx.output.refreshToken
      );
      return { output: { ...ctx.output, ...tokens } };
    },
    getProfile: async ctx => {
      let workspaceId =
        ctx.output.workspaceId ??
        (await new RoboflowClient(ctx.output).getAuthenticatedWorkspace());
      return { profile: { id: workspaceId, name: workspaceId } };
    }
  } satisfies SlateAuthWithOauth<{}, z.infer<typeof authOutputSchema>>);

async function exchangeToken(body: URLSearchParams, previousRefreshToken?: string) {
  let { data } = await oauthClient.post('/oauth/token', body.toString());
  let tokens = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Roboflow',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy',
    required: true
  });
  if (!tokens.refreshToken) {
    throw createApiServiceError(
      'Roboflow did not return a refresh token. Reconnect your account.'
    );
  }
  return tokens;
}
