import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      domain: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your MOCO API key (personal or account key)'),
      domain: z
        .string()
        .describe('Your MOCO subdomain (e.g., "mycompany" for mycompany.mocoapp.com)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          domain: ctx.input.domain
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; domain: string };
      input: { token: string; domain: string };
    }) => {
      let client = new Client(ctx.output);
      let session = await client.getSession();

      return {
        profile: {
          id: String(session.id),
          name: session.uuid
        }
      };
    }
  });
