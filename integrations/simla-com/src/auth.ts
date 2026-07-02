import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Simla.com API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Simla.com API key (at least 32 characters). Found in Integration section of admin settings.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (_ctx: any) => {
      // We cannot determine the subdomain here since it's in config, not auth.
      // We'll return a minimal profile.
      return {
        profile: {
          id: 'simla-user',
          name: 'Simla.com User'
        }
      };
    }
  });
