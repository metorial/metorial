import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { type AircallAuth, Client } from './lib/client';
import { fail, id, parseNativeJson, text, upstream } from './lib/contracts';
import { protectedAdapter } from './lib/transport';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['bearer', 'basic']),
      apiId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Aircall OAuth',
        url: 'https://developers.aircall.io/api-references#oauth-technology-partners'
      }
    ],
    scopes: [
      {
        title: 'Public API',
        description:
          'Company-level Aircall Public API access, subject to authorized numbers and account permissions.',
        scope: 'public_api'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://dashboard.aircall.io/oauth/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', scope: ctx.scopes.join(' '), state: ctx.state })}`
    }),
    handleCallback: async ctx => {
      try {
        const response = await createAxios({
          adapter: protectedAdapter({ token: ctx.clientSecret, authType: 'bearer' }, [
            ctx.code
          ]),
          baseURL: 'https://api.aircall.io/v1',
          timeout: 30000,
          maxRedirects: 0,
          maxContentLength: 1024 * 1024,
          transformResponse: [parseNativeJson]
        }).post('/oauth/token', {
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code'
        });
        const tokens = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Aircall'
        });
        return {
          output: {
            token: text(tokens.token, 'OAuth access token', 8192),
            authType: 'bearer' as const
          }
        };
      } catch (error) {
        throw upstream(error, 'OAuth authorization');
      }
    },
    getProfile: async (ctx: { output: AircallAuth }) => {
      const client = new Client(ctx.output),
        company = await client.getCompany(),
        integration = await client.getIntegration();
      return {
        profile: {
          id: String(id(integration.company_id, 'Native company ID')),
          name: text(company.name, 'Native company name')
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth (API Key)',
    key: 'basic_auth',
    inputSchema: z.object({
      apiId: z
        .string()
        .describe('API ID from Company settings; identifies API-key settings, not a person.'),
      apiToken: z.string().describe('Secret API token shown on creation.')
    }),
    getOutput: async ctx => {
      const apiId = text(ctx.input.apiId, 'API ID', 256),
        apiToken = text(ctx.input.apiToken, 'API token', 8192);
      if (apiId.includes(':') || /\s/.test(apiId) || /\s/.test(apiToken))
        fail(
          'API ID and token must not contain whitespace, and API ID must not contain a colon.'
        );
      return {
        output: {
          token: Buffer.from(`${apiId}:${apiToken}`, 'utf8').toString('base64'),
          authType: 'basic' as const,
          apiId
        }
      };
    },
    getProfile: async (ctx: { output: AircallAuth; input: { apiId: string } }) => {
      const apiId = text(ctx.input.apiId, 'API ID', 256);
      if (Buffer.from(ctx.output.token, 'base64').toString('utf8').split(':')[0] !== apiId)
        fail('Basic profile input does not match the original API-key settings. Reconnect.');
      const company = await new Client(ctx.output).getCompany();
      return {
        profile: {
          id: `api-key:${text(ctx.input.apiId, 'API ID', 256)}`,
          name: `${text(company.name, 'Native company name')} (API key settings)`
        }
      };
    }
  });
