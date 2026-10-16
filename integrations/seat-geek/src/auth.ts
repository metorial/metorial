import { createApiServiceError, SlateAuth } from 'slates';
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
      clientId: z.string().describe('SeatGeek API client ID from developer.seatgeek.com'),
      clientSecret: z
        .string()
        .optional()
        .describe('SeatGeek API client secret (optional - can be omitted)')
    }),

    getOutput: async ctx => {
      let clientId = ctx.input.clientId.trim();
      if (!clientId) throw createApiServiceError('A SeatGeek API client ID is required.');
      return {
        output: {
          clientId,
          clientSecret: ctx.input.clientSecret
        }
      };
    }
  });
