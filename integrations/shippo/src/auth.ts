import { createAxios, isApiErrorRecord, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { authScheme, invalid, upstream } from './lib/helpers';

export let auth = SlateAuth.create()
  .output(
    z.object({ token: z.string(), tokenType: z.enum(['ShippoToken', 'Bearer']).optional() })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Shippo API test or live token. OAuth credentials use the separate OAuth connection.'
        )
    }),
    getOutput: async ctx => {
      authScheme({ token: ctx.input.token, tokenType: 'ShippoToken' });
      return { output: { token: ctx.input.token, tokenType: 'ShippoToken' as const } };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Full Access',
        description:
          'Shippo’s only supported OAuth scope, for shipping on behalf of the connected account.',
        scope: '*'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://goshippo.com/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: ctx.clientId, scope: ctx.scopes.join(' '), state: ctx.state, redirect_uri: ctx.redirectUri }).toString()}`
    }),
    handleCallback: async ctx => {
      const axios = createAxios({
        baseURL: 'https://goshippo.com',
        timeout: 30_000,
        maxRedirects: 0
      });
      let data: unknown;
      try {
        const response = await axios.post(
          '/oauth/access_token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            grant_type: 'authorization_code'
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        data = response.data;
      } catch (error) {
        throw upstream(error, 'OAuth token exchange', true);
      }
      if (!isApiErrorRecord(data) || data.token_type !== 'bearer' || data.scope !== '*')
        throw invalid(
          'Shippo did not return its documented Bearer token and scope. Reconnect through the registered partner application.'
        );
      const token = normalizeOAuthTokenResponse(data, { providerLabel: 'Shippo' }).token;
      authScheme({ token, tokenType: 'Bearer' });
      return { output: { token, tokenType: 'Bearer' as const } };
    }
  });
