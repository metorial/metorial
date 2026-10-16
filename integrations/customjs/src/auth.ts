import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { getAccount } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your CustomJS API key from https://app.customjs.space.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Provide your CustomJS API key.');
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await getAccount(ctx.output.token);
      return {
        profile: {
          id: data.workspaceId || data.id || data.userId,
          name: data.workspaceName || data.name,
          email: data.email
        }
      };
    }
  });
