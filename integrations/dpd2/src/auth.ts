import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth',
    key: 'basic_auth',

    inputSchema: z.object({
      username: z.string().describe('Your DPD account username'),
      apiPassword: z
        .string()
        .describe('Your DPD API password (found in Profile > DPD API Credentials)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.apiPassword
        }
      };
    },

    getProfile: async (ctx: {
      output: { username: string; token: string };
      input: { username: string; apiPassword: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://api.getdpd.com/v2/',
        auth: {
          username: ctx.output.username,
          password: ctx.output.token
        }
      });

      let _response = await axios.get('/');

      return {
        profile: {
          name: ctx.output.username
        }
      };
    }
  });
