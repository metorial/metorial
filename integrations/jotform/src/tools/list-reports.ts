import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReportsTool = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List reports across all forms or for a specific form. Reports include Excel, CSV, printable charts, and embeddable HTML tables.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z
        .string()
        .optional()
        .describe('Form ID to list reports for. If omitted, returns reports across all forms.')
    })
  )
  .output(
    z.object({
      reports: z.array(
        z.object({
          reportId: z.string().describe('Report identifier'),
          formId: z.string().describe('Associated form ID'),
          title: z.string().describe('Report title'),
          listType: z.string().describe('Report type (e.g., csv, excel, grid)'),
          createdAt: z.string().describe('Report creation date'),
          url: z.string().optional().describe('URL to access the report')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let reports = ctx.input.formId
      ? await client.listFormReports(ctx.input.formId)
      : await client.listReports();

    let mapped = (reports || []).map((r: any) => ({
      reportId: String(r.id),
      formId: String(r.form_id),
      title: r.title || '',
      listType: r.list_type || '',
      createdAt: r.created_at || '',
      url: r.url || undefined
    }));

    return {
      output: { reports: mapped },
      message: `Found **${mapped.length}** report(s)${ctx.input.formId ? ` for form ${ctx.input.formId}` : ''}.`
    };
  })
  .build();
