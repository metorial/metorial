import {
  buildApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

type ProfileContext = { output: { token: string; authMethod: 'oauth' | 'basic' } };

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userId: z.string().optional(),
      authMethod: z.enum(['oauth', 'basic'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.acuityscheduling.com/docs/oauth2'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.acuityscheduling.com/docs/oauth2'
      }
    ],

    scopes: [
      {
        title: 'API Access',
        description: 'Full access to the Acuity Scheduling API',
        scope: 'api-v1'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://acuityscheduling.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAuthenticatedAxios({
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Acuity Scheduling',
            reason: 'acuity_oauth',
            operation: 'token exchange'
          })
      });
      let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });
      let response = await axios.post(
        'https://acuityscheduling.com/oauth2/token',
        body.toString()
      );
      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Acuity Scheduling',
        operation: 'token exchange'
      });

      return {
        output: {
          token: tokens.token,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: ProfileContext) => {
      let client = new Client(ctx.output);
      let response = await client.getMe();

      return {
        profile: {
          id: String(response.id),
          name: response.name,
          email: response.email
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z.string().describe('Your numeric Acuity User ID'),
      token: z.string().describe('Your Acuity API Key')
    }),

    getOutput: async ctx => {
      let basicToken = btoa(`${ctx.input.userId}:${ctx.input.token}`);

      return {
        output: {
          token: basicToken,
          userId: ctx.input.userId,
          authMethod: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: ProfileContext) => {
      let client = new Client(ctx.output);
      let response = await client.getMe();

      return {
        profile: {
          id: String(response.id),
          name: response.name,
          email: response.email
        }
      };
    }
  });
