import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      clientId: z.string(),
      clientSecret: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z
        .string()
        .describe('SeatGeek API client ID from seatgeek.com/account/develop'),
      clientSecret: z
        .string()
        .optional()
        .describe('SeatGeek API client secret (optional - can be omitted)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret
        }
      };
    }
  });
