import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      password: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Password',
    key: 'api_key_password',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'IBM X-Force Exchange API Key. Generated from Settings > API Access at https://exchange.xforce.ibmcloud.com/settings/api'
        ),
      password: z
        .string()
        .describe(
          'IBM X-Force Exchange API Password. Only shown at generation time — save it immediately.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          password: ctx.input.password
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; password: string };
      input: { apiKey: string; password: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.xforce.ibmcloud.com',
        auth: {
          username: ctx.output.token,
          password: ctx.output.password
        }
      });

      await http.get('/api/usage');
      return {
        profile: {
          id: ctx.output.token
        }
      };
    }
  });
