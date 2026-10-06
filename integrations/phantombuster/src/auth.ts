import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, identifier, text } from './lib/client';

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
        .describe('PhantomBuster API key. Found in Workspace Settings > Technical > API keys.')
    }),

    getOutput: async ctx => {
      if (
        !ctx.input.apiKey.trim() ||
        !ctx.input.apiKey.isWellFormed() ||
        /\s/.test(ctx.input.apiKey)
      )
        throw createApiServiceError('Enter a valid workspace API key.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      const org = await new Client({ token: ctx.output.token }).fetchOrg();
      return {
        profile: {
          id: identifier(org.id, 'Workspace ID'),
          name: text(org.name) ?? identifier(org.id, 'Workspace ID')
        }
      };
    }
  });
