import { SlateAuth } from 'slates';
import { z } from 'zod';
import { FilesComClient } from './lib/client';
import { nativeId, serviceOrigin } from './lib/contracts';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Files.com API key; owning-user, workspace and key restrictions still apply.'
        ),
      subdomain: z
        .string()
        .optional()
        .describe('Site subdomain, without .files.com. Omit to use app.files.com.')
    }),
    getOutput: async (ctx: { input: { apiKey: string; subdomain?: string } }) => {
      const baseUrl = serviceOrigin(ctx.input.subdomain);
      const client = new FilesComClient({ token: ctx.input.apiKey, baseUrl });
      await client.getCurrentApiKey();
      return { output: { token: ctx.input.apiKey, baseUrl } };
    },
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      const key = await new FilesComClient(ctx.output).getCurrentApiKey();
      return {
        profile: {
          id: String(nativeId(key.id)),
          name: typeof key.name === 'string' ? key.name : 'Files.com API key'
        }
      };
    }
  });
