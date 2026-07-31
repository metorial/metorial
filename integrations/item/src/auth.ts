import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export const itemAuthInputSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'API key cannot be empty.')
    .describe(
      'Item API key from Settings > System > API Key, typically starting with sk_live_. Sent as the x-api-key header.'
    )
});

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
    docs: [
      {
        type: 'docs.auth.token',
        name: 'Item API authentication',
        url: 'https://docs.item.app/index#authentication'
      }
    ],
    inputSchema: itemAuthInputSchema,
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    },

    // Item issues organization-scoped keys and exposes no current-user endpoint, so the
    // schema call doubles as the credential check and reports the workspace it unlocked.
    getProfile: async (ctx: { output: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let objectTypes = await client.getSchema();

      return {
        profile: {
          objectTypeCount: objectTypes.length,
          objectTypes: objectTypes.map(objectType => objectType.slug)
        }
      };
    }
  });
