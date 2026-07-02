import { SlateAuth } from 'slates';
import { z } from 'zod';
import { RenderClient } from './lib/client';

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
      token: z.string().describe('Render API key from Account Settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let client = new RenderClient(ctx.output.token);
      let user = await client.getUser();

      return {
        profile: {
          email: user.email,
          name: user.name
        }
      };
    }
  });
