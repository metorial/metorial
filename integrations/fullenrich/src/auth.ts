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
        .describe('Your FullEnrich API key, found at https://app.fullenrich.com/app/api')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let result = await new Client({ token: ctx.output.token }).verifyApiKey();
      return {
        profile: {
          id: result.workspaceId,
          name: `Workspace ${result.workspaceId}`
        }
      };
    }
  });
