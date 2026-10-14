import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let listSignalTypes = SlateTool.create(spec, {
  name: 'List Signal Types',
  key: 'list_signal_types',
  description:
    'Discover the current signal-type catalog, subtype vocabulary, and optional live row counts before filtering company or contact enrichment. This lookup does not consume credits.',
  tags: { readOnly: true }
})
  .authMethods(['api_key', 'signal_api_key'])
  .input(
    z.object({
      includeCounts: z
        .boolean()
        .optional()
        .describe('Include live per-type counts and subtype lists'),
      association: z
        .enum(['company', 'contact'])
        .optional()
        .describe('Filter types by company or contact association'),
      since: z
        .string()
        .optional()
        .describe(
          'When requesting counts, count signals detected on or after this ISO-8601 timestamp'
        )
    })
  )
  .output(
    z.object({
      catalog: z
        .record(z.string(), z.any())
        .describe(
          'Complete catalog: signal_types, metadata, defaults, subtype vocabulary, and counts when requested'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token, ctx.auth.signalToken ?? ctx.auth.token);
    let result = await client.listSignalTypes(ctx.input);
    return {
      output: { catalog: result },
      message: 'Retrieved the current signal-type catalog.'
    };
  })
  .build();
