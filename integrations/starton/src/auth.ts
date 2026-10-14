import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { StartonClient } from './lib/client';

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
      apiKey: z.string().describe('Starton API key from the Developer section of your project')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('A Starton API key is required.');
      }
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let project = await new StartonClient({ token: ctx.output.token }).getProject();

      return {
        profile: {
          id: project.id,
          name: project.name
        }
      };
    }
  });
