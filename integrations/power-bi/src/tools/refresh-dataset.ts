import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let refreshEntrySchema = z.object({
  requestId: z.string().optional().describe('Refresh request ID'),
  refreshType: z.string().optional().describe('Type of refresh'),
  startTime: z.string().optional().describe('When the refresh started'),
  endTime: z.string().optional().describe('When the refresh completed'),
  status: z.string().optional().describe('Refresh status'),
  serviceExceptionJson: z.string().optional().describe('Error details if refresh failed')
});

export let refreshDataset = SlateTool.create(spec, {
  name: 'Refresh Dataset',
  key: 'refresh_dataset',
  description: `Trigger a dataset refresh or view refresh history. Use this to keep datasets up-to-date with the latest source data and monitor refresh status.`,
  instructions: [
    'Use action "trigger" to start a new refresh. The refresh runs asynchronously.',
    'Use action "history" to check recent refresh status and diagnose failures.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['trigger', 'history'])
        .describe('Whether to trigger a refresh or view history'),
      datasetId: z.string().describe('ID of the dataset'),
      workspaceId: z.string().optional().describe('Workspace ID containing the dataset'),
      historyCount: z
        .number()
        .optional()
        .describe('Number of history entries to return (default 10)')
    })
  )
  .output(
    z.object({
      triggered: z.boolean().optional().describe('Whether a refresh was triggered'),
      refreshHistory: z
        .array(refreshEntrySchema)
        .optional()
        .describe('Recent refresh history entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { action, datasetId, workspaceId, historyCount } = ctx.input;

    if (action === 'trigger') {
      await client.refreshDataset(datasetId, workspaceId);
      return {
        output: { triggered: true },
        message: `Triggered refresh for dataset **${datasetId}**. The refresh runs asynchronously — check history for status.`
      };
    }

    let history = await client.getRefreshHistory(datasetId, workspaceId, historyCount || 10);
    let mapped = history.map((h: any) => ({
      requestId: h.requestId,
      refreshType: h.refreshType,
      startTime: h.startTime,
      endTime: h.endTime,
      status: h.status,
      serviceExceptionJson: h.serviceExceptionJson
    }));

    return {
      output: { refreshHistory: mapped },
      message: `Retrieved **${mapped.length}** refresh history entries for dataset **${datasetId}**.`
    };
  })
  .build();
