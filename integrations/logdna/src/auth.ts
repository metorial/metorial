import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Service key for configuration and management APIs'),
      ingestionToken: z
        .string()
        .optional()
        .describe(
          'Ingestion key for log ingestion API (optional, only needed for ingesting logs)'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Key',
    key: 'service_key',
    inputSchema: z.object({
      serviceKey: z
        .string()
        .describe(
          'Service key found under Settings > Organization > API Keys in LogDNA dashboard'
        ),
      ingestionKey: z
        .string()
        .optional()
        .describe('Ingestion key for log ingestion (optional)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.serviceKey,
          ingestionToken: ctx.input.ingestionKey
        }
      };
    }
  });
