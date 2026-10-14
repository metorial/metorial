import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, getObjectResult } from './lib/client';

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
      apiKey: z.string().describe('Insighto.ai API key (starts with "in-")')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let user = getObjectResult(await new Client(ctx.output).getUser());
      if (!user.id || !user.email) {
        throw createApiServiceError('Insighto.ai did not return a valid account profile.');
      }
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name || [user.first_name, user.last_name].filter(Boolean).join(' ')
        }
      };
    }
  });
