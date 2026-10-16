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
      token: z
        .string()
        .describe(
          'Handwrytten API key. Found under Profile > Integrations in your Handwrytten account.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let user = await client.getUser();
      let id = user.id ?? user.user_id;
      if (id === undefined || id === null || String(id).trim() === '') {
        throw createApiServiceError('Handwrytten did not return an account ID.', {
          reason: 'invalid_handwrytten_profile'
        });
      }

      return {
        profile: {
          id: String(id),
          ...(typeof user.email === 'string' ? { email: user.email } : {}),
          name: [user.fname, user.lname].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
