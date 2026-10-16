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
          'Your All-Images.ai API key. Create one at https://app.all-images.ai/en/api-keys'
        )
    }),

    getOutput: async ctx => {
      new Client(ctx.input.apiKey);
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let profile = await new Client(ctx.output.token).checkApiKey();

      return {
        profile: {
          email: profile.email,
          name: profile.name
        }
      };
    }
  });
