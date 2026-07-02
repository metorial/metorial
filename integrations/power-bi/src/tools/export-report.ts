import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let exportReport = SlateTool.create(spec, {
  name: 'Export Report',
  key: 'export_report',
  description: `Export a Power BI report to a file format (PDF, PPTX, PNG) or check the status of an ongoing export. The export runs asynchronously — first trigger the export, then poll the status.`,
  instructions: [
    'Use action "start" to begin an export. You will receive an exportId to track progress.',
    'Use action "status" to check whether the export is complete.'
  ],
  constraints: [
    'Export is only available for reports on Premium or Embedded capacity.',
    'Large reports may take several minutes to export.'
  ]
})
  .input(
    z.object({
      action: z.enum(['start', 'status']).describe('Start an export or check export status'),
      reportId: z.string().describe('ID of the report'),
      workspaceId: z.string().optional().describe('Workspace ID containing the report'),
      format: z
        .enum(['PDF', 'PPTX', 'PNG'])
        .optional()
        .describe('Export format (required for start)'),
      exportId: z
        .string()
        .optional()
        .describe('Export ID to check status (required for status)')
    })
  )
  .output(
    z.object({
      exportId: z.string().optional().describe('Export request ID'),
      status: z
        .string()
        .optional()
        .describe('Export status (e.g., Running, Succeeded, Failed)'),
      percentComplete: z.number().optional().describe('Export progress percentage'),
      resourceLocation: z
        .string()
        .optional()
        .describe('URL to download the exported file when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { action, reportId, workspaceId, format, exportId } = ctx.input;

    if (action === 'start') {
      if (!format) throw new Error('format is required to start an export');
      let result = await client.exportReport(reportId, { format }, workspaceId);
      return {
        output: {
          exportId: result.id,
          status: result.status,
          percentComplete: result.percentComplete
        },
        message: `Export started for report **${reportId}** as **${format}**. Export ID: **${result.id}**.`
      };
    }

    if (!exportId) throw new Error('exportId is required to check status');
    let status = await client.getExportStatus(reportId, exportId, workspaceId);
    return {
      output: {
        exportId: status.id,
        status: status.status,
        percentComplete: status.percentComplete,
        resourceLocation: status.resourceLocation
      },
      message: `Export **${exportId}** is **${status.status}** (${status.percentComplete || 0}% complete).`
    };
  })
  .build();
