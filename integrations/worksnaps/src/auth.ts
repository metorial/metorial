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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Worksnaps API token. Find it under Profile & Settings >> Web Service API.'
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
      let user = await new Client(ctx.output.token).getCurrentUser();
      let id = typeof user.id === 'string' ? user.id : undefined;
      if (!id) throw createApiServiceError('Worksnaps returned a current user without an ID.');
      let email = typeof user.email === 'string' ? user.email : undefined;
      let firstName = typeof user.firstName === 'string' ? user.firstName : undefined;
      let lastName = typeof user.lastName === 'string' ? user.lastName : undefined;
      let login = typeof user.login === 'string' ? user.login : undefined;
      let name = [firstName, lastName].filter(Boolean).join(' ') || login || undefined;

      return {
        profile: {
          id,
          email,
          name
        }
      };
    }
  });
