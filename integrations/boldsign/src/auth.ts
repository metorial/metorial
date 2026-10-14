import { createHash, randomBytes } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let authOutputSchema = z.object({
  token: z.string(),
  authType: z.enum(['oauth', 'api_key']).optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});

type AuthOutput = z.infer<typeof authOutputSchema>;

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.boldsign.com/authentication/oauth-2-0/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.boldsign.com/authentication/introduction/?region=us#scopes'
      }
    ],

    scopes: [
      {
        title: 'OpenID',
        description: 'OpenID Connect identity token',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Access to user email address',
        scope: 'email'
      },
      {
        title: 'Offline Access',
        description: 'Obtain refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'Documents',
        description: 'Full access to document operations',
        scope: 'BoldSign.Documents.All'
      },
      {
        title: 'Users',
        description: 'Read organization users',
        scope: 'BoldSign.Users.Read'
      },
      {
        title: 'Templates',
        description: 'Full access to template operations',
        scope: 'BoldSign.Templates.All'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(32).toString('base64url');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });

      return {
        url: `https://account.boldsign.com/connect/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let verifier = z.string().min(43).max(128).safeParse(ctx.callbackState?.codeVerifier);
      if (!verifier.success) {
        throw createApiServiceError(
          'The OAuth verification state is missing. Start authorization again.'
        );
      }
      let axios = createAuthenticatedAxios({
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'BoldSign',
            reason: 'boldsign_api_error',
            operation: 'OAuth token exchange'
          })
      });

      let response = await axios.post(
        'https://account.boldsign.com/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          code_verifier: verifier.data,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, { providerLabel: 'BoldSign' }),
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'The OAuth refresh token is missing. Reconnect with offline_access enabled.'
        );
      }

      let axios = createAuthenticatedAxios({
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'BoldSign',
            reason: 'boldsign_api_error',
            operation: 'OAuth token exchange'
          })
      });

      let response = await axios.post(
        'https://account.boldsign.com/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'BoldSign',
            previousRefreshToken: ctx.output.refreshToken
          }),
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: {}; scopes: string[] }) => {
      let axios = createAuthenticatedAxios({
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'BoldSign',
            reason: 'boldsign_api_error',
            operation: 'OAuth profile'
          }),
        baseURL: 'https://account.boldsign.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/connect/userinfo');
      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name: data.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('BoldSign API Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  });
