import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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

      let response = await axios.get('/auth/key');
      let data = response.data?.data;

      return {
        profile: {
          name: data?.label || 'OpenRouter API Key',
          usageLimit: data?.limit,
          usage: data?.usage,
          rateLimitInterval: data?.rate_limit?.interval,
          rateLimitRequests: data?.rate_limit?.requests
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

      let response = await axios.post('/auth/keys', {
        code: ctx.code
      });

      let token = response.data?.key;

      return {
        output: {
          token
        }
      };
    }
  });
