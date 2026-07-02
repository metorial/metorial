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
      apiKey: z
        .string()
        .describe(
          'Ragic API key. Generate it from Personal Settings > Profile in your Ragic account.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      serverDomain: z
        .string()
        .describe('Ragic server domain (e.g., www.ragic.com, na3.ragic.com)'),
      email: z.string().describe('Your Ragic account email address'),
      password: z.string().describe('Your Ragic account password')
    }),
    getOutput: async ctx => {
      let ax = createAxios({
        baseURL: `https://${ctx.input.serverDomain}`
      });

      let response = await ax.post('/AUTH', null, {
        params: {
          u: ctx.input.email,
          p: ctx.input.password,
          login_type: 'sessionId'
        }
      });

      let sessionId = response.data?.sessionId || response.data;

      return {
        output: {
          token: String(sessionId)
        }
      };
    }
  });
