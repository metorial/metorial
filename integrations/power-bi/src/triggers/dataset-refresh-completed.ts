import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let datasetRefreshCompleted = SlateTrigger.create(spec, {
  name: 'Dataset Refresh Completed',
  key: 'dataset_refresh_completed',
  description:
    'Triggers when a dataset refresh completes (successfully or with failure). Polls refresh history for monitored datasets.'
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset'),
      datasetName: z.string().optional().describe('Name of the dataset'),
      requestId: z.string().describe('Unique refresh request ID'),
      refreshType: z.string().optional().describe('Type of refresh'),
      startTime: z.string().optional().describe('When the refresh started'),
      endTime: z.string().optional().describe('When the refresh completed'),
      status: z.string().describe('Refresh status (Completed, Failed, Disabled, etc.)'),
      serviceExceptionJson: z.string().optional().describe('Error details if refresh failed')
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('ID of the refreshed dataset'),
      datasetName: z.string().optional().describe('Name of the refreshed dataset'),
      refreshType: z.string().optional().describe('Type of refresh'),
      startTime: z.string().optional().describe('When the refresh started'),
      endTime: z.string().optional().describe('When the refresh completed'),
      status: z.string().describe('Refresh status'),
      serviceExceptionJson: z.string().optional().describe('Error details if refresh failed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new PowerBIClient({ token: ctx.auth.token });
      let state = ctx.state || {};
      let seenRequestIds: string[] = state.seenRequestIds || [];
      let datasetIds: string[] = state.datasetIds || [];

      // On first run, discover datasets from all workspaces
      if (datasetIds.length === 0) {
        try {
          let workspaces = await client.listWorkspaces();
          for (let ws of workspaces) {
            try {
              let datasets = await client.listDatasets(ws.id);
              for (let ds of datasets) {
                if (ds.isRefreshable) {
                  datasetIds.push(`${ws.id}:${ds.id}:${ds.name || ''}`);
                }
              }
            } catch {
              /* skip inaccessible workspaces */
            }
          }
          // Also check "My Workspace"
          try {
            let myDatasets = await client.listDatasets();
            for (let ds of myDatasets) {
              if (ds.isRefreshable) {
                datasetIds.push(`:${ds.id}:${ds.name || ''}`);
              }
            }
          } catch {
            /* skip */
          }
        } catch {
          /* skip */
        }
      }

      let inputs: any[] = [];

      for (let entry of datasetIds.slice(0, 20)) {
        // Limit to 20 datasets to avoid rate limits
        let parts = entry.split(':');
        let workspaceId = parts[0];
        let datasetId = parts[1] || '';
        let datasetName = parts[2];
        try {
          let history = await client.getRefreshHistory(datasetId, workspaceId || undefined, 5);
          for (let refresh of history) {
            if (
              refresh.requestId &&
              !seenRequestIds.includes(refresh.requestId) &&
              refresh.endTime
            ) {
              inputs.push({
                datasetId,
                datasetName: datasetName || undefined,
                requestId: refresh.requestId,
                refreshType: refresh.refreshType,
                startTime: refresh.startTime,
                endTime: refresh.endTime,
                status: refresh.status,
                serviceExceptionJson: refresh.serviceExceptionJson
              });
              seenRequestIds.push(refresh.requestId);
            }
          }
        } catch {
          /* skip inaccessible datasets */
        }
      }

      // Keep only the last 500 seen request IDs to prevent unbounded growth
      if (seenRequestIds.length > 500) {
        seenRequestIds = seenRequestIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          seenRequestIds,
          datasetIds
        }
      };
    },

    handleEvent: async ctx => {
      let statusSuffix = ctx.input.status === 'Completed' ? 'succeeded' : 'failed';
      return {
        type: `dataset_refresh.${statusSuffix}`,
        id: ctx.input.requestId,
        output: {
          datasetId: ctx.input.datasetId,
          datasetName: ctx.input.datasetName,
          refreshType: ctx.input.refreshType,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          status: ctx.input.status,
          serviceExceptionJson: ctx.input.serviceExceptionJson
        }
      };
    }
  })
  .build();
