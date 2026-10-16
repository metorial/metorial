import { SlateAuth } from 'slates';
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
        .describe('API key obtained from the Enterprise Remote Retriever portal')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let result = await new Client({ token: ctx.output.token }).validateUser();

      return {
        profile: {
          email: result.email
        }
      };
    }
  });
