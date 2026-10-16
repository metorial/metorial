import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { radiusRecordTypeSchema } from '../lib/schemas';
import { spec } from '../spec';

export let countRadiusSearch = SlateTool.create(spec, {
  name: 'Count Radius Search Results',
  key: 'count_radius_search',
  description:
    'Count available recipient records near an address before buying lead data. Nothing is charged and no mailing list is created. A later radius_search purchase supports at most 2500 records (5 in API Test Mode).',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      address: z.string().min(1),
      postalCode: z.string().min(1),
      recordCount: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .describe('Maximum number of records to count'),
      recordTypes: radiusRecordTypeSchema.optional(),
      includeCondos: z.boolean().optional()
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of available records, up to recordCount'),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ThanksIoClient({ token: ctx.auth.token }).countRadiusSearch(
      ctx.input
    );
    return {
      output: { count: result.count as number, raw: result },
      message: `Found ${result.count} matching recipient record(s).`
    };
  })
  .build();
