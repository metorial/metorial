import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Authentication token (Database Token or JWT)'),
      authType: z
        .enum(['database_token', 'jwt'])
        .describe('The type of authentication being used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Database Token',
    key: 'database_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Baserow Database Token. Create one in Settings > Database Tokens in the Baserow UI.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe('Base URL of your Baserow instance (e.g. https://api.baserow.io)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'database_token' as const
        }
      };
    },
    getProfile: async (_ctx: any) => {
      return {
        profile: {
          id: 'database-token-user',
          name: 'Database Token User'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'JWT (Email & Password)',
    key: 'jwt',
    inputSchema: z.object({
      email: z.string().describe('Your Baserow account email address'),
      password: z.string().describe('Your Baserow account password'),
      baseUrl: z
        .string()
        .optional()
        .describe('Base URL of your Baserow instance (e.g. https://api.baserow.io)')
    }),
    getOutput: async ctx => {
      let baseUrl = ctx.input.baseUrl || 'https://api.baserow.io';
      let httpClient = createAxios({ baseURL: baseUrl });

      let response = await httpClient.post('/api/user/token-auth/', {
        username: ctx.input.email,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.token,
          authType: 'jwt' as const
        }
      };
    },
    getProfile: async (ctx: any) => {
      let baseUrl = ctx.input.baseUrl || 'https://api.baserow.io';
      let httpClient = createAxios({ baseURL: baseUrl });

      let response = await httpClient.get('/api/user/dashboard/', {
        headers: {
          Authorization: `JWT ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: String(response.data.id || ''),
          name: response.data.first_name || response.data.username || '',
          email: response.data.email || ''
        }
      };
    }
  });
