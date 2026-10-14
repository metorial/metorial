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
        .describe(
          'Your APIpie AI API key. Obtain one from https://apipie.ai/dashboard/profile/api-keys'
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
      await client.listModels({ type: 'llm' });

      return {
        profile: {
          id: 'apipie-user',
          name: 'APIpie AI User'
        }
      };
    }
  });
