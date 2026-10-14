import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSalesSummary = SlateTool.create(spec, {
  name: 'Get Sales Summary',
  key: 'get_sales_summary',
  description:
    'Retrieve AgencyZoom dashboard sales totals and goals for a period or date range. Optionally filter by agency location, producer, or carrier using IDs from list_reference_data.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      period: z
        .string()
        .optional()
        .describe(
          'Date period such as today, yesterday, thisweek, lastweek, lastmonth, mtd, qtd, ytd, or YYYY-MM-DD|YYYY-MM-DD. Defaults to mtd.'
        ),
      startDate: z.string().optional().describe('Start date, YYYY-MM-DD.'),
      endDate: z.string().optional().describe('End date, YYYY-MM-DD.'),
      location: z
        .string()
        .optional()
        .describe('Agency location code from list_reference_data using locations.'),
      producerId: z
        .number()
        .optional()
        .describe('Producer ID from list_reference_data using employees.'),
      carrierId: z
        .number()
        .optional()
        .describe('Carrier ID from list_reference_data using carriers.')
    })
  )
  .output(
    z.object({
      summary: z
        .any()
        .describe('Original sales dashboard response, including available totals and goals.')
    })
  )
  .handleInvocation(async ctx => {
    let summary = await new Client(ctx.auth).getSalesSummary({
      period: ctx.input.period,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      loc: ctx.input.location,
      lsp: ctx.input.producerId,
      insco: ctx.input.carrierId
    });
    return { output: { summary }, message: 'Retrieved the sales summary.' };
  })
  .build();
