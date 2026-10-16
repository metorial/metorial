import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Abyssale workspace API key. Found in Workspace Settings > API Key.')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiKey } }),
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let workspace = await new AbyssaleClient(ctx.output).getWorkspace();
      if (typeof workspace.company !== 'string' || !workspace.company) {
        throw createApiServiceError(
          'Abyssale verified the key but did not return a workspace name. Use a workspace API key.'
        );
      }
      return { profile: { name: workspace.company } };
    }
  });
