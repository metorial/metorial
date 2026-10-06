import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { apiError, baseUrl, parse, text } from './lib/validation';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Fillout API key from Settings > Developer.')
    }),
    getOutput: async ctx => ({ output: { token: text(ctx.input.token, 'Fillout API key') } })
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [],
    getAuthorizationUrl: async ctx => ({
      url: `https://build.fillout.com/authorize/oauth?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, state: ctx.state })}`
    }),
    handleCallback: async ctx => {
      const code = text(ctx.code, 'Authorization code');
      let response: { status: number; data: unknown };
      try {
        response = await createAxios({
          timeout: 30000,
          maxRedirects: 0,
          maxContentLength: 1024 * 1024
        }).post('https://server.fillout.com/public/oauth/accessToken', {
          code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        });
      } catch (error) {
        throw apiError(error, 'OAuth exchange');
      }
      if (response.status !== 200)
        throw apiError({ response: { status: response.status } }, 'OAuth exchange');
      const data = parse(
        z.object({ access_token: z.string().min(1), base_url: z.string().optional() }),
        response.data,
        'OAuth token'
      );
      return {
        output: {
          token: text(data.access_token, 'Fillout access token'),
          baseUrl: baseUrl(data.base_url)
        }
      };
    }
  });
