import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Connect account token, or an Import source token for import-only use'),
      importToken: z
        .string()
        .optional()
        .describe('Separate Import source token for data validation and ingestion'),
      clientId: z
        .string()
        .optional()
        .describe('Account ID discovered from the Connect credential when a source exists'),
      region: z
        .enum(['us', 'eu'])
        .optional()
        .describe(
          'Account data pipeline region; older connections may use configured region instead'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Connect account token from Account Settings (Advanced/Premium or trial). For import-only use, provide the source token from Integration Settings instead.'
        ),
      importToken: z
        .string()
        .optional()
        .describe(
          'Optional Import API source token. Required alongside a Connect token when using both management and ingestion tools.'
        ),
      region: z
        .enum(['us', 'eu'])
        .optional()
        .describe(
          'Account region for credential verification. Defaults to us for new connections; choose eu for Europe.'
        )
    }),
    getOutput: async ctx => {
      if (
        !ctx.input.token.trim() ||
        (ctx.input.importToken !== undefined && !ctx.input.importToken.trim())
      ) {
        throw createApiServiceError('Provide a non-empty Stitch access token.');
      }
      const region = ctx.input.region ?? 'us';
      let clientId: string | undefined;
      if (!ctx.input.token.trim().startsWith('at_')) {
        const sources = await new StitchConnectClient({
          token: ctx.input.token.trim(),
          region
        }).listSources();
        const ids = [
          ...new Set(
            sources.map(source => source.stitch_client_id).filter(value => value !== undefined)
          )
        ];
        if (ids.length > 1)
          throw createApiServiceError(
            'Stitch returned sources from multiple accounts for a single Connect token.'
          );
        if (ids[0] !== undefined) clientId = String(ids[0]);
      }
      return {
        output: {
          token: ctx.input.token.trim(),
          importToken: ctx.input.importToken?.trim(),
          region,
          clientId
        }
      };
    }
  });
