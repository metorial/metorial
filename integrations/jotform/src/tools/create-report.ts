import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createReportTool = SlateTool.create(spec, {
  name: 'Create Report',
  key: 'create_report',
  description: `Create a new report for a JotForm form. Reports can be generated as CSV, Excel, grid (HTML table), or visual charts.`
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to create a report for'),
      title: z.string().describe('Title for the report'),
      listType: z
        .enum(['csv', 'excel', 'grid', 'calendar', 'rss', 'visual'])
        .describe('Type of report to generate'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of question IDs to include in the report. If omitted, all fields are included.'
        )
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('ID of the newly created report'),
      title: z.string().describe('Report title'),
      url: z.string().optional().describe('URL to access the report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let result = await client.createFormReport(ctx.input.formId, {
      title: ctx.input.title,
      listType: ctx.input.listType,
      fields: ctx.input.fields
    });

    return {
      output: {
        reportId: String(result.id || result.reportID || result),
        title: result.title || ctx.input.title,
        url: result.url || undefined
      },
      message: `Created **${ctx.input.listType}** report "${ctx.input.title}" for form ${ctx.input.formId}.`
    };
  })
  .build();
