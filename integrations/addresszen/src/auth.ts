import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      managementToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().min(1).describe('AddressZen API key (typically begins with ak_)'),
      managementKey: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Account Management Key (uk_) required for private key details, usage, logs, and settings'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          managementToken: ctx.input.managementKey
        }
      };
    }
  });
