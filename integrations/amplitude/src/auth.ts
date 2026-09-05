import { createHash, randomBytes } from 'node:crypto';
import { createApiServiceError, SlateAuth, type SlateAuthWithOauth } from 'slates';
import { z } from 'zod';
import {
  type AmplitudeMcpRegion,
  amplitudeRegionSchema,
  exchangeAmplitudeOAuthToken,
  getAmplitudeMcpOrigin
} from './lib/mcp-auth';

let amplitudeAuthOutputSchema = z.object({
  apiKey: z.string().optional().describe('Amplitude project API Key'),
  secretKey: z.string().optional().describe('Amplitude project Secret Key'),
  token: z.string().describe('Authentication token'),
  region: amplitudeRegionSchema.optional(),
  refreshToken: z.string().optional(),
  oauthTokenEndpointAuthMethod: z.enum(['none', 'client_secret_post']).optional(),
  expiresAt: z.string().optional()
});

export let auth = SlateAuth.create()
  .output(amplitudeAuthOutputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key + Secret Key',
    key: 'api_key_secret',

    inputSchema: z.object({
      region: amplitudeRegionSchema.default('US').describe('Amplitude data residency region.'),
      apiKey: z
        .string()
        .describe('Amplitude project API Key. Found under Organization Settings > Projects.'),
      secretKey: z
        .string()
        .describe(
          'Amplitude project Secret Key. Found under Organization Settings > Projects.'
        )
    }),

    getOutput: async ctx => {
      let basicToken = btoa(`${ctx.input.apiKey}:${ctx.input.secretKey}`);
      return {
        output: {
          apiKey: ctx.input.apiKey,
          secretKey: ctx.input.secretKey,
          token: basicToken,
          region: ctx.input.region
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Amplitude MCP OAuth',
    key: 'mcp_oauth',
    inputSchema: z.object({
      region: amplitudeRegionSchema.default('US').describe('Amplitude data residency region.')
    }),
    scopes: [
      {
        scope: 'mcp:read',
        title: 'Read analytics',
        description: 'Read authorized Amplitude analytics and content.'
      },
      {
        scope: 'mcp:write',
        title: 'Edit analytics content',
        description: 'Create and update authorized Amplitude analytics content.'
      },
      {
        scope: 'offline_access',
        title: 'Keep connected',
        description: 'Refresh access when the access token expires.'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let region = ctx.input.region;
      if (!ctx.clientId) {
        throw createApiServiceError('Amplitude OAuth requires a registered client ID.', {
          reason: 'amplitude_oauth_error'
        });
      }
      let codeVerifier = randomBytes(32).toString('base64url');
      let codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        resource: `${getAmplitudeMcpOrigin(region)}/mcp`,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
      return {
        url: `${getAmplitudeMcpOrigin(region)}/authorize?${params}`,
        callbackState: {
          codeVerifier,
          region,
          state: ctx.state,
          redirectUri: ctx.redirectUri
        }
      };
    },
    handleCallback: async ctx => {
      let state = z
        .object({
          codeVerifier: z.string().min(43),
          region: amplitudeRegionSchema,
          state: z.string(),
          redirectUri: z.string()
        })
        .safeParse(ctx.callbackState);
      if (
        !state.success ||
        state.data.state !== ctx.state ||
        state.data.redirectUri !== ctx.redirectUri ||
        state.data.region !== ctx.input.region
      ) {
        throw createApiServiceError(
          'Amplitude OAuth callback state is invalid. Reconnect your account.',
          {
            reason: 'amplitude_oauth_error'
          }
        );
      }
      let saved = state.data;
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        code: ctx.code,
        redirect_uri: saved.redirectUri,
        code_verifier: saved.codeVerifier,
        resource: `${getAmplitudeMcpOrigin(saved.region)}/mcp`
      });
      if (ctx.clientSecret) params.set('client_secret', ctx.clientSecret);
      let tokens = await exchangeAmplitudeOAuthToken(saved.region, params);
      return {
        output: {
          ...tokens,
          region: saved.region,
          oauthTokenEndpointAuthMethod: ctx.clientSecret ? 'client_secret_post' : 'none'
        }
      };
    },
    handleTokenRefresh: async ctx => {
      let { refreshToken, region } = ctx.output;
      if (
        !refreshToken ||
        !ctx.clientId ||
        (!ctx.clientSecret && ctx.output.oauthTokenEndpointAuthMethod !== 'none') ||
        !region
      ) {
        throw createApiServiceError(
          'Amplitude OAuth refresh credentials are missing. Reconnect your account.',
          {
            reason: 'amplitude_oauth_error'
          }
        );
      }
      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        refresh_token: refreshToken,
        resource: `${getAmplitudeMcpOrigin(region)}/mcp`
      });
      if (ctx.clientSecret) params.set('client_secret', ctx.clientSecret);
      let tokens = await exchangeAmplitudeOAuthToken(region, params, refreshToken);
      return {
        output: {
          ...tokens,
          region,
          oauthTokenEndpointAuthMethod: ctx.clientSecret ? 'client_secret_post' : 'none'
        }
      };
    }
  } satisfies SlateAuthWithOauth<
    { region: AmplitudeMcpRegion },
    z.infer<typeof amplitudeAuthOutputSchema>
  >);
