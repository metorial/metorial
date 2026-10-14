import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SignWellClient } from './lib/client';

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
        .describe('Your SignWell API key. Found in Settings -> API in your SignWell account.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new SignWellClient({ token: ctx.output.token });
      let result = await client.getMe();

      return {
        profile: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name
        }
      };
    }
  });
