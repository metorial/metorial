import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Bearer token for API authorization'),
      clientId: z.string().describe('Client ID provided by GatherUp')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    inputSchema: z.object({
      bearerToken: z.string().describe('Bearer token found in Account Owner Details'),
      clientId: z.string().describe('Client ID found in Account Owner Details')
    }),
    getOutput: async ctx => {
      await new Client({
        token: ctx.input.bearerToken,
        clientId: ctx.input.clientId
      }).testConnection();
      return {
        output: {
          token: ctx.input.bearerToken,
          clientId: ctx.input.clientId
        }
      };
    }
  });
