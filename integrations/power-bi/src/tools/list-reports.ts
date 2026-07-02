import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let reportSchema = z.object({
  reportId: z.string().describe('Unique identifier of the report'),
  name: z.string().describe('Display name of the report'),
  datasetId: z.string().optional().describe('ID of the underlying dataset'),
  webUrl: z.string().optional().describe('Web URL for viewing the report'),
  embedUrl: z.string().optional().describe('URL for embedding the report'),
  reportType: z.string().optional().describe('Type of report')
});

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List all Power BI reports. Optionally filter by workspace. Returns report names, IDs, dataset bindings, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID to filter reports. If omitted, lists reports from "My Workspace".'
        )
    })
  )
  .output(
    z.object({
      reports: z.array(reportSchema).describe('List of reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let reports = await client.listReports(ctx.input.workspaceId);

    let mapped = reports.map((r: any) => ({
      reportId: r.id,
      name: r.name,
      datasetId: r.datasetId,
      webUrl: r.webUrl,
      embedUrl: r.embedUrl,
      reportType: r.reportType
    }));

    return {
      output: { reports: mapped },
      message: `Found **${mapped.length}** report(s).`
    };
  })
  .build();
