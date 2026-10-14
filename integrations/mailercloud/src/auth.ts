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
        .describe('Your Mailercloud API key. Found under Account > Integrations > API Keys.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await new Client({ token: ctx.output.token }).getAccountPlan();

      return {
        profile: {
          name: response?.data?.name ?? undefined,
          email: response?.data?.email ?? undefined
        }
      };
    }
  });
