import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let pageSchema = z.object({
  name: z.string().describe('Internal name of the page'),
  displayName: z.string().describe('Display name of the page'),
  order: z.number().optional().describe('Page order')
});

export let manageReport = SlateTool.create(spec, {
  name: 'Manage Report',
  key: 'manage_report',
  description: `Get report details, list pages, clone a report, rebind to a different dataset, or delete a report.`,
  instructions: [
    'Use "get" to retrieve full report details and pages.',
    'Use "clone" to duplicate a report, optionally to another workspace.',
    'Use "rebind" to change the underlying dataset of a report.',
    'Use "delete" to permanently remove a report.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'clone', 'rebind', 'delete']).describe('Action to perform'),
      reportId: z.string().describe('ID of the report'),
      workspaceId: z.string().optional().describe('Workspace ID containing the report'),
      cloneName: z
        .string()
        .optional()
        .describe('Name for the cloned report (required for clone)'),
      targetWorkspaceId: z.string().optional().describe('Target workspace ID for clone'),
      targetDatasetId: z.string().optional().describe('Target dataset ID for clone or rebind')
    })
  )
  .output(
    z.object({
      reportId: z.string().optional().describe('Report ID'),
      name: z.string().optional().describe('Report name'),
      datasetId: z.string().optional().describe('Underlying dataset ID'),
      webUrl: z.string().optional().describe('Web URL'),
      embedUrl: z.string().optional().describe('Embed URL'),
      pages: z.array(pageSchema).optional().describe('Report pages'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { action, reportId, workspaceId } = ctx.input;

    if (action === 'get') {
      let report = await client.getReport(reportId, workspaceId);
      let pages: any[] = [];
      try {
        pages = await client.getReportPages(reportId, workspaceId);
      } catch {
        /* pages may not be available */
      }

      return {
        output: {
          reportId: report.id,
          name: report.name,
          datasetId: report.datasetId,
          webUrl: report.webUrl,
          embedUrl: report.embedUrl,
          pages: pages.map((p: any) => ({
            name: p.name,
            displayName: p.displayName,
            order: p.order
          })),
          success: true
        },
        message: `Retrieved report **${report.name}** with **${pages.length}** page(s).`
      };
    }

    if (action === 'clone') {
      if (!ctx.input.cloneName) throw new Error('cloneName is required for clone');
      let cloned = await client.cloneReport(
        reportId,
        {
          name: ctx.input.cloneName,
          targetWorkspaceId: ctx.input.targetWorkspaceId,
          targetModelId: ctx.input.targetDatasetId
        },
        workspaceId
      );
      return {
        output: {
          reportId: cloned.id,
          name: cloned.name,
          datasetId: cloned.datasetId,
          webUrl: cloned.webUrl,
          embedUrl: cloned.embedUrl,
          success: true
        },
        message: `Cloned report as **${cloned.name}** (${cloned.id}).`
      };
    }

    if (action === 'rebind') {
      if (!ctx.input.targetDatasetId)
        throw new Error('targetDatasetId is required for rebind');
      await client.rebindReport(reportId, ctx.input.targetDatasetId, workspaceId);
      return {
        output: { reportId, datasetId: ctx.input.targetDatasetId, success: true },
        message: `Rebound report **${reportId}** to dataset **${ctx.input.targetDatasetId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteReport(reportId, workspaceId);
      return {
        output: { reportId, success: true },
        message: `Deleted report **${reportId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
