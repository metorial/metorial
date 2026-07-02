import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `Retrieve report URLs and metadata for sent and scheduled email campaigns. Optionally filter by a date range using Unix timestamps (UTC). Scheduled emails will have a null report URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .number()
        .optional()
        .describe('Start of date range as a Unix timestamp in seconds (UTC)'),
      to: z
        .number()
        .optional()
        .describe('End of date range as a Unix timestamp in seconds (UTC)')
    })
  )
  .output(
    z.object({
      reports: z.array(
        z.object({
          reportId: z.string().describe('Report/email identifier'),
          name: z.string().describe('Report name'),
          scheduledDate: z.string().describe('Scheduled date and time'),
          status: z.string().describe('Status (e.g. sent)'),
          previewUrl: z.string().describe('URL to preview the email'),
          reportUrl: z
            .string()
            .nullable()
            .describe('URL to full report, null for scheduled/unsent emails')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reports = await client.getReports(ctx.input.from, ctx.input.to);

    let mapped = reports.map(r => ({
      reportId: r.id,
      name: r.name,
      scheduledDate: r.scheduled_date,
      status: r.status,
      previewUrl: r.preview_url,
      reportUrl: r.report_url
    }));

    return {
      output: { reports: mapped },
      message: `Found **${mapped.length}** report(s).`
    };
  })
  .build();
