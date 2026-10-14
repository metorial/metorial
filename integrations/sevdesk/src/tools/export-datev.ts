import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient, sevdeskDateToTimestamp } from '../lib/client';
import { spec } from '../spec';

export let exportDatev = SlateTool.create(spec, {
  name: 'Export DATEV',
  key: 'export_datev',
  description: `Prepare a downloadable ZIP of accounting data in DATEV CSV format for a given date range. Used for transferring outgoing invoices and incoming vouchers to a tax advisor. The accounting year must already be configured in sevDesk.`,
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
      exportContent: z
        .any()
        .describe(
          'Provider DATEV export data or download reference, alongside the downloadable ZIP.'
        ),
      startDate: z.string(),
      endDate: z.string(),
      scope: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let startDate = sevdeskDateToTimestamp(ctx.input.startDate, 'startDate');
    let endDate = sevdeskDateToTimestamp(ctx.input.endDate, 'endDate');
    if (startDate > endDate) {
      throw createApiServiceError('startDate must be on or before endDate.');
    }
    let filename = `datev-${ctx.input.startDate}-${ctx.input.endDate}.zip`;
    let scope = { REVENUE: 'E', EXPENSE: 'X', ALL: 'EX' }[ctx.input.scope];
    let client = new SevdeskClient({ token: ctx.auth.token });
    let result = await client.exportDatev({
      startDate,
      endDate,
      scope,
      Download: false,
      enshrine: false
    });
    await ctx.addAttachment({
      type: 'url',
      url: 'https://my.sevdesk.de/api/v1/Export/datevCSV',
      headers: { Authorization: ctx.auth.token },
      query: {
        Download: 'true',
        startDate: String(startDate),
        endDate: String(endDate),
        scope,
        enshrine: 'false'
      },
      filename,
      mimeType: 'application/zip'
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
