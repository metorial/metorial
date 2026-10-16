import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CincopaClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Cincopa API token. Create one from your Account Dashboard under the profile icon.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let data = await new CincopaClient(ctx.output).ping();
      return {
        profile: {
          id:
            typeof data.userid === 'string'
              ? data.userid
              : typeof data.accid === 'string'
                ? data.accid
                : undefined,
          email:
            typeof data.useremail === 'string'
              ? data.useremail
              : typeof data.accemail === 'string'
                ? data.accemail
                : undefined
        }
      };
    }
  });
