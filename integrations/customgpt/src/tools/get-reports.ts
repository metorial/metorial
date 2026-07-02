import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getReports = SlateTool.create(spec, {
  name: 'Get Reports',
  key: 'get_reports',
  description: `Retrieve analytics and intelligence reports for an AI agent. Available report types include customer intelligence, traffic analytics, query analytics, conversation analytics, chart data, and leads export.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent'),
      reportType: z
        .enum(['intelligence', 'traffic', 'queries', 'conversations', 'analysis', 'leads'])
        .describe('Type of report to retrieve')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('Type of report retrieved'),
      reportContent: z.record(z.string(), z.unknown()).nullable().describe('Report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let report = await client.getReport(ctx.input.projectId, ctx.input.reportType);

    return {
      output: {
        reportType: ctx.input.reportType,
        reportContent: report
      },
      message: `Retrieved **${ctx.input.reportType}** report for agent **${ctx.input.projectId}**.`
    };
  })
  .build();
