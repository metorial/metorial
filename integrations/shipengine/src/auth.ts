import { createHash } from 'node:crypto';
import { SlateAuth } from 'slates';
import { z } from 'zod';
import { baseUrlSchema, Client } from './lib/client';

const outputSchema = z.object({ token: z.string(), baseUrl: baseUrlSchema.optional() });
export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'ShipEngine API key from the dashboard API Keys page. Sandbox keys start with TEST_.'
        ),
      baseUrl: baseUrlSchema
        .default('https://api.shipengine.com')
        .describe('Choose the supported US or EU API host nearest your integration.')
    }),
    getOutput: async ctx => {
      const client = new Client(ctx.input);
      await client.settings();
      return { output: { token: ctx.input.token, baseUrl: client.baseUrl } };
    },
    getProfile: async (ctx: {
      output: z.infer<typeof outputSchema>;
      config?: { baseUrl?: string };
    }) => {
      const client = new Client({
        token: ctx.output.token,
        baseUrl: ctx.output.baseUrl ?? ctx.config?.baseUrl
      });
      await client.settings();
      const sandbox = ctx.output.token.startsWith('TEST_');
      return {
        profile: {
          id: createHash('sha256')
            .update(`${client.baseUrl}\n${ctx.output.token}`)
            .digest('hex'),
          name: `ShipEngine ${sandbox ? 'sandbox' : 'production'} API key`
        }
      };
    }
  });
