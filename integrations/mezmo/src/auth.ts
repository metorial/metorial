import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('IAM Access Token for Mezmo API'),
      ingestionKey: z.string().optional().describe('Ingestion key for sending logs to Mezmo')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'IAM Access Token',
    key: 'iam_token',
    inputSchema: z.object({
      token: z.string().describe('IAM Access Token from Settings > Organization > API Keys'),
      ingestionKey: z
        .string()
        .optional()
        .describe(
          'Ingestion key for log ingestion (optional, from Settings > Organization > API Keys)'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token))
        throw createApiServiceError('A valid Mezmo IAM access token is required.');
      if (
        ctx.input.ingestionKey !== undefined &&
        (!ctx.input.ingestionKey.trim() || /[\r\n]/.test(ctx.input.ingestionKey))
      )
        throw createApiServiceError('A valid Mezmo ingestion key is required when supplied.');
      return {
        output: {
          token: ctx.input.token.trim(),
          ingestionKey: ctx.input.ingestionKey?.trim()
        }
      };
    }
  });
