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
        .describe('Your Woodpecker API key. Found in Add-ons → API & Integrations → API keys.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new Client({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: data.id?.toString(),
          email: data.email,
          name:
            data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`
              : data.email
        }
      };
    }
  });
