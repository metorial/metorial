import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { openRouterApiError, openRouterServiceError } from './lib/errors';

let recordValue = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('OpenRouter API key (starts with sk-or-)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data: Record<string, unknown> | undefined;
      try {
        let response = await axios.get('/key');
        data = recordValue(response.data?.data);
      } catch (error) {
        throw openRouterApiError(error, 'get API key profile');
      }

      let rateLimit = recordValue(data?.rate_limit);

      return {
        profile: {
          name: data?.label || 'OpenRouter API Key',
          usageLimit: data?.limit,
          usage: data?.usage,
          rateLimitInterval: rateLimit?.interval,
          rateLimitRequests: rateLimit?.requests
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth PKCE',
    key: 'oauth_pkce',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        callback_url: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://openrouter.ai/auth?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let axios = createAxios({
        baseURL: 'https://openrouter.ai/api/v1'
      });

      let response: any;
      try {
        response = await axios.post('/auth/keys', {
          code: ctx.code
        });
      } catch (error) {
        throw openRouterApiError(error, 'exchange OAuth code');
      }

      let token = response.data?.key;
      if (typeof token !== 'string' || token.length === 0) {
        throw openRouterServiceError('OpenRouter OAuth callback did not return an API key.');
      }

      return {
        output: {
          token
        }
      };
    }
  });
