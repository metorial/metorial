import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
          'Your Deep Image API key. Find it at https://deep-image.ai/app/my-profile/api'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let account = await client.getAccountInfo();

      return {
        profile: {
          email: account.email,
          name: account.username
        }
      };
    }
  });
