import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from './lib/client';

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
      apiKey: z.string().describe('CustomGPT API key')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let user = await new CustomGPTClient({ token: ctx.output.token }).getUser();

      return {
        profile: {
          id: user?.id ? String(user.id) : undefined,
          email: user?.email,
          name: user?.name
        }
      };
    }
  });
