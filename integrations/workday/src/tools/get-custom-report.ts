import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomReport = SlateTool.create(spec, {
  name: 'Get Custom Report',
  key: 'get_custom_report',
  description: `Retrieve data from a Workday custom report via Report-as-a-Service (RaaS). Reports must be Advanced type and web-service enabled in Workday. Supports passing prompt parameters to filter report data.`,
  instructions: [
    'The report must be configured as an Advanced type report with "Enable As Web Service" checked in Workday',
    'The report owner is typically the Workday username of the report creator',
    'Prompt parameters correspond to report prompts configured in Workday'
  ],
  constraints: [
    'RaaS does not natively support pagination — large reports may take longer to return',
    'The connection and report definition must allow web-service access. CSV returns a downloadable file.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportOwner: z.string().describe('Workday username of the report owner'),
      reportName: z.string().describe('Name of the custom report'),
      format: z.enum(['json', 'csv']).optional().describe('Response format (default: json)'),
      prompts: z
        .record(z.string(), z.string())
        .optional()
        .describe('Report prompt parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      reportData: z
        .any()
        .describe('Structured JSON report data, or null when CSV is prepared for download'),
      fileName: z.string().optional().describe('CSV download filename'),
      mimeType: z.string().optional().describe('CSV media type')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    if (ctx.input.format === 'csv') {
      const download = client.reportDownload(
        ctx.input.reportOwner,
        ctx.input.reportName,
        ctx.input.prompts
      );
      await ctx.addAttachment({
        type: 'url',
        ...download,
        filename: 'report.csv',
        mimeType: 'text/csv'
      });
      return {
        output: { reportData: null, fileName: 'report.csv', mimeType: 'text/csv' },
        message: 'Prepared the custom report CSV for download.'
      };
    }
    const result = await client.getCustomReport(ctx.input.reportOwner, ctx.input.reportName, {
      format: 'json',
      prompts: ctx.input.prompts
    });
    return {
      output: { reportData: result },
      message: 'Retrieved the authorized custom report data.'
    };
  })
  .build();
