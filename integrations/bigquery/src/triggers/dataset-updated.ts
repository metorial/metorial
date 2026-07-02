import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let datasetUpdated = SlateTrigger.create(spec, {
  name: 'Dataset Changed',
  key: 'dataset_changed',
  description:
    'Triggers when datasets are created, modified, or deleted in the project. Detects new datasets, removed datasets, and metadata changes (name, description, labels, etc.).'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'deleted']),
      datasetId: z.string(),
      projectId: z.string(),
      friendlyName: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      lastModifiedTime: z.string().optional(),
      labels: z.record(z.string(), z.string()).optional()
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('Dataset ID'),
      projectId: z.string().describe('Project ID'),
      friendlyName: z.string().optional().describe('Human-readable name'),
      description: z.string().optional().describe('Dataset description'),
      location: z.string().optional().describe('Geographic location'),
      lastModifiedTime: z.string().optional().describe('Last modification time'),
      labels: z.record(z.string(), z.string()).optional().describe('Dataset labels')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BigQueryClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        location: ctx.config.location
      });

      let result = await client.listDatasets({ maxResults: 1000 });
      let currentDatasets = (result.datasets || []).map(
        (d: any) => d.datasetReference.datasetId as string
      );

      let previousDatasetMap = (ctx.state?.datasetMap || {}) as Record<string, string>;
      let previousDatasets = Object.keys(previousDatasetMap);

      let inputs: Array<{
        eventType: 'created' | 'updated' | 'deleted';
        datasetId: string;
        projectId: string;
        friendlyName?: string;
        description?: string;
        location?: string;
        lastModifiedTime?: string;
        labels?: Record<string, string>;
      }> = [];

      let newDatasetMap: Record<string, string> = {};

      for (let dataset of result.datasets || []) {
        let datasetId = dataset.datasetReference.datasetId;
        let detail = await client.getDataset(datasetId);
        let modTime = detail.lastModifiedTime || '';
        newDatasetMap[datasetId] = modTime;

        let isNew = !previousDatasets.includes(datasetId);
        let isModified = !isNew && previousDatasetMap[datasetId] !== modTime;

        if (isNew || isModified) {
          inputs.push({
            eventType: isNew ? 'created' : 'updated',
            datasetId,
            projectId: detail.datasetReference.projectId,
            friendlyName: detail.friendlyName,
            description: detail.description,
            location: detail.location,
            lastModifiedTime: modTime,
            labels: detail.labels
          });
        }
      }

      for (let prevId of previousDatasets) {
        if (!currentDatasets.includes(prevId)) {
          inputs.push({
            eventType: 'deleted',
            datasetId: prevId,
            projectId: ctx.config.projectId
          });
        }
      }

      return {
        inputs,
        updatedState: {
          datasetMap: newDatasetMap
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `dataset.${input.eventType}`,
        id: `${input.datasetId}-${input.lastModifiedTime || Date.now()}`,
        output: {
          datasetId: input.datasetId,
          projectId: input.projectId,
          friendlyName: input.friendlyName,
          description: input.description,
          location: input.location,
          lastModifiedTime: input.lastModifiedTime,
          labels: input.labels
        }
      };
    }
  })
  .build();
