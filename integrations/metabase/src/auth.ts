import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  token: z.string(),
  instanceUrl: z.string()
});

type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Metabase API key (created in Admin Settings > Authentication > API Keys)'),
      instanceUrl: z
        .string()
        .describe(
          'The URL of your Metabase instance (e.g., https://your-metabase.example.com)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          instanceUrl: ctx.input.instanceUrl.replace(/\/+$/, '')
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { token: string; instanceUrl: string };
    }) => {
      let http = createAxios({
        baseURL: `${ctx.output.instanceUrl}/api`,
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let response = await http.get('/user/current');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'session_token',

    inputSchema: z.object({
      username: z.string().describe('Your Metabase email address'),
      password: z.string().describe('Your Metabase password'),
      instanceUrl: z
        .string()
        .describe(
          'The URL of your Metabase instance (e.g., https://your-metabase.example.com)'
        )
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.instanceUrl.replace(/\/+$/, '');
      let http = createAxios({
        baseURL: `${baseUrl}/api`
      });

      let response = await http.post('/session', {
        username: ctx.input.username,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.id,
          instanceUrl: baseUrl
        }
      };
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { username: string; password: string; instanceUrl: string };
    }) => {
      let http = createAxios({
        baseURL: `${ctx.output.instanceUrl}/api`,
        headers: {
          'X-Metabase-Session': ctx.output.token
        }
      });

      let response = await http.get('/user/current');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
