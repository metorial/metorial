import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Basic Auth',
    key: 'basic_auth',

    inputSchema: z.object({
      email: z.string().describe('Your SimpleKPI account email address'),
      token: z.string().describe('Your API token from Settings > Developer API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          email: ctx.input.email
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; email: string };
      input: { email: string; token: string };
    }) => {
      return {
        profile: {
          email: ctx.output.email
        }
      };
    }
  });
