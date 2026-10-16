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
      token: z
        .string()
        .describe('Typless API key from Settings > API Keys in the Typless dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let profile = await new Client({ token: ctx.output.token }).getAuthenticationProfile();

      return {
        profile: {
          id: profile.email,
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
