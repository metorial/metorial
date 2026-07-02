import { SlateAuth } from 'slates';
import { z } from 'zod';

const keyTypeSchema = z.enum(['party_key', 'agent_key', 'unknown']);

const keyTypeForApiKey = (apiKey: string): z.infer<typeof keyTypeSchema> => {
  if (apiKey.startsWith('sk_ntl_')) return 'party_key';
  if (apiKey.startsWith('ak_ntl_')) return 'agent_key';
  return 'unknown';
};

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      keyType: keyTypeSchema
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .min(1)
        .describe(
          'Natural API key. Party keys start with sk_ntl_; agent keys start with ak_ntl_.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        keyType: keyTypeForApiKey(ctx.input.apiKey)
      }
    })
  });
