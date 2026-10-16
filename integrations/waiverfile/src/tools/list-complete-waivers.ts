import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let listCompleteWaivers = SlateTool.create(spec, {
  name: 'List Complete Waivers',
  key: 'list_complete_waivers',
  description:
    'Retrieve a page of complete waiver records signed within a date range, including agreement and event information. Use list_waivers_by_date for tabular data with custom-column and participant consolidation options.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      startDate: z.string().describe('Start of the signing date range in UTC, ISO 8601'),
      endDate: z.string().describe('End of the signing date range in UTC, ISO 8601'),
      pageIndex: z.number().int().min(0).default(0).describe('Zero-based page index'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(500)
        .default(100)
        .describe('Records per page, up to 500')
    })
  )
  .output(z.object({ waivers: z.any().describe('Complete provider response for this page') }))
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient(ctx.auth);
    let waivers = await client.getAllWaiversByDateRange(ctx.input);
    return {
      output: { waivers },
      message: 'Retrieved the requested page of complete waiver records.'
    };
  })
  .build();
