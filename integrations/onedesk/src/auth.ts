import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['api_key', 'legacy_token'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your OneDesk Public API key. Generate one in Admin > Integrations > API.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { apiKey: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://app.onedesk.com/rest/public',
        headers: {
          'OD-Public-API-Key': ctx.output.token
        }
      });
      let response = await http.get('/organization/profileAndPolicy');
      let org = response.data;
      return {
        profile: {
          name: org.organizationName || org.name || 'OneDesk Organization'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password (Legacy)',
    key: 'legacy_token',
    inputSchema: z.object({
      email: z.string().describe('Your OneDesk account email address.'),
      password: z.string().describe('Your OneDesk account password.')
    }),
    getOutput: async ctx => {
      let http = createAxios({
        baseURL: 'https://app.onedesk.com/rest/2.0'
      });
      let response = await http.post('/login/loginUser', {
        email: ctx.input.email,
        password: ctx.input.password
      });
      let authToken = response.data?.data || response.data?.authenticationToken;
      if (!authToken) {
        throw new Error(
          'Failed to authenticate with OneDesk. Please check your email and password.'
        );
      }
      return {
        output: {
          token: authToken,
          authMethod: 'legacy_token' as const
        }
      };
    }
  });
