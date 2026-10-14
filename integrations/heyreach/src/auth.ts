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
        .describe('HeyReach API key. Found in Integrations > API in your HeyReach account.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let verified = await new Client({ token: ctx.output.token }).checkApiKey();

      return {
        profile: {
          id: 'heyreach-user',
          name: 'HeyReach Account',
          verified
        }
      };
    }
  });
