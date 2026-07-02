import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Wolfram Alpha AppID')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'AppID',
    key: 'app_id',

    inputSchema: z.object({
      token: z.string().describe('Your Wolfram Alpha AppID obtained from the Developer Portal')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
