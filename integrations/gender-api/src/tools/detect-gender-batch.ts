import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectGenderBatch = SlateTool.create(spec, {
  name: 'Detect Gender in Batch',
  key: 'detect_gender_batch',
  description:
    'Predict gender for up to 100 first names in one request. Set an optional correlation ID and localization on each entry. Returns the original provider result for each lookup, including input IDs, prediction confidence and sample counts.',
  constraints: [
    'Some API tokens allow only three lookups per request. Use smaller batches if the provider reports this account limit.',
    'Each name consumes one request credit.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      queries: z
        .array(
          z.object({
            firstName: z.string().min(1).max(50).describe('First name to classify'),
            country: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
            locale: z.string().optional().describe('Browser locale such as en_US'),
            ip: z.string().optional().describe('IPv4 or IPv6 address for localization'),
            id: z
              .string()
              .max(50)
              .optional()
              .describe('Correlation ID echoed in the provider input')
          })
        )
        .min(1)
        .max(100)
        .describe('First-name lookups to submit together')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Unmodified provider results')
    })
  )
  .handleInvocation(async ctx => {
    let results = await new Client(ctx.auth.token).getGenderBatch(ctx.input.queries);
    return {
      output: { results },
      message: `Received ${results.length} gender prediction results.`
    };
  })
  .build();
