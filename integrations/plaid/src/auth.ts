import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      clientId: z.string().describe('Plaid client ID'),
      secret: z.string().describe('Plaid API secret key')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Your Plaid client_id from the Plaid Dashboard'),
      secret: z.string().describe('Your Plaid secret key for the chosen environment')
    }),

    getOutput: async ctx => {
      return {
        output: {
          clientId: ctx.input.clientId,
          secret: ctx.input.secret
        }
      };
    }
  });
