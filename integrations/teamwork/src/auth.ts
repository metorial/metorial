import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { TeamworkClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiEndpoint: z.string().optional().describe('Connected Teamwork site URL'),
      authType: z.enum(['oauth', 'api_key']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [],
    inputSchema: z.object({
      siteName: z
        .string()
        .optional()
        .describe('Optional Teamwork site name to target during login')
    }),
    getAuthorizationUrl: async ctx => {
      let baseUrl = ctx.input?.siteName
        ? `https://${ctx.input.siteName}.teamwork.com`
        : 'https://www.teamwork.com';
      let params = new URLSearchParams({
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        state: ctx.state
      });
      return { url: `${baseUrl}/launchpad/login?${params.toString()}`, input: ctx.input };
    },
    handleCallback: async ctx => {
      let axios = createAuthenticatedAxios({
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Teamwork',
            reason: 'teamwork_api_error'
          })
      });
      let response = await axios.post('https://www.teamwork.com/launchpad/v1/token.json', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });
      let data = response.data;
      let apiEndpoint = data.installation?.apiEndPoint || data.apiEndPoint;
      if (!data.access_token || !apiEndpoint) {
        throw createApiServiceError(
          'Teamwork did not return an access token and site URL. Reconnect the account.'
        );
      }
      return {
        output: { token: data.access_token, apiEndpoint, authType: 'oauth' as const },
        input: ctx.input
      };
    },
    getProfile: async (ctx: {
      output: { token: string; apiEndpoint?: string };
      input: { siteName?: string };
      scopes: string[];
    }) => {
      let axios = createAuthenticatedAxios({
        authHeader: { value: `Bearer ${ctx.output.token}` },
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Teamwork',
            reason: 'teamwork_api_error'
          })
      });
      let response = await axios.get('https://www.teamwork.com/launchpad/v1/userinfo.json');
      let user = response.data;
      return {
        profile: {
          id: user.user_id != null ? String(user.user_id) : user.sub,
          email: user.email,
          name: [user.given_name, user.family_name].filter(Boolean).join(' ') || undefined,
          imageUrl: user.picture
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your Teamwork API key (Profile > API & Mobile)'),
      siteName: z
        .string()
        .min(1)
        .describe(
          'Your Teamwork site name, such as yourcompany from yourcompany.teamwork.com'
        ),
      region: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('Site region: us for .teamwork.com or eu for .eu.teamwork.com')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        apiEndpoint: `https://${ctx.input.siteName}.${ctx.input.region === 'eu' ? 'eu.teamwork.com' : 'teamwork.com'}`,
        authType: 'api_key' as const
      }
    }),
    getProfile: async (ctx: {
      output: { token: string; apiEndpoint?: string };
      input: { apiKey: string; siteName: string; region: 'us' | 'eu' };
    }) => {
      let client = new TeamworkClient({
        token: ctx.output.token,
        apiEndpoint: ctx.output.apiEndpoint,
        siteName: ctx.input.siteName,
        region: ctx.input.region,
        authType: 'api_key'
      });
      let result = await client.getCurrentUser();
      let person = result.person;
      return {
        profile: {
          id: person?.id != null ? String(person.id) : undefined,
          email: person?.['email-address'] || person?.emailAddress || undefined,
          name:
            [
              person?.['first-name'] || person?.firstName,
              person?.['last-name'] || person?.lastName
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          imageUrl: person?.['avatar-url'] || person?.avatarUrl || undefined
        }
      };
    }
  });
