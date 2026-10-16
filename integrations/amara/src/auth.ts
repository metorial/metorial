import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Amara API key from your account settings page'),
      username: z.string().describe('Your Amara username')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim() || !ctx.input.username.trim()) {
        throw createApiServiceError('Provide your Amara API key and username.');
      }
      return {
        output: {
          token: ctx.input.token.trim(),
          username: ctx.input.username.trim()
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; username: string } }) => {
      let client = new Client(ctx.output);
      let user = await client.getUser(ctx.output.username);

      return {
        profile: {
          id: user.id,
          name: user.full_name || user.username || user.id,
          imageUrl: user.avatar
        }
      };
    }
  });
