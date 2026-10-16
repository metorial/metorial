import { createApiServiceError, SlateAuth } from 'slates';
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
        .describe('Your Promptmate.io API key. You can find it in your account settings.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your Promptmate.io API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getUserInfo();
      let email = typeof user.email === 'string' ? user.email : undefined;
      let id = typeof user.userId === 'string' && user.userId ? user.userId : email;
      let name = [user.userName, user.name, user.displayName].find(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      if (!id) {
        throw createApiServiceError(
          'Promptmate.io returned account information without an email or user ID.',
          {
            reason: 'promptmate_invalid_profile'
          }
        );
      }

      return {
        profile: {
          id,
          name,
          email
        }
      };
    }
  });
