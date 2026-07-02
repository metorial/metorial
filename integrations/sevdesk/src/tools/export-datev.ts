import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let exportDatev = SlateTool.create(spec, {
  name: 'Export DATEV',
  key: 'export_datev',
  description: `Export accounting data in DATEV CSV format for a given date range. Used for transferring data to tax advisors or external accounting systems (e.g., DATEV Unternehmen Online).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date of the export period (YYYY-MM-DD)'),
      endDate: z.string().describe('End date of the export period (YYYY-MM-DD)'),
      scope: z
        .enum(['REVENUE', 'EXPENSE', 'ALL'])
        .describe('Scope: REVENUE=outgoing invoices, EXPENSE=incoming vouchers, ALL=both')
    })
  )
  .output(
    z.object({
      exportContent: z.any().describe('DATEV export data (CSV content or download reference)'),
      startDate: z.string(),
      endDate: z.string(),
      scope: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let result = await client.exportDatev({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      scope: ctx.input.scope
    });

    return {
      output: {
        exportContent: result?.objects ?? result,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        scope: ctx.input.scope
      },
      message: `Exported DATEV data for **${ctx.input.scope}** from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
    };
  })
  .build();
