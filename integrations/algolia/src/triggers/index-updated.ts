import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let indexUpdated = SlateTrigger.create(spec, {
  name: 'Index Updated',
  key: 'index_updated',
  description:
    'Detects when Algolia indices are created, updated, or deleted by polling the list of indices and comparing with previous state.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of index change detected'),
      indexName: z.string().describe('Name of the affected index'),
      entries: z.number().optional().describe('Number of records in the index'),
      updatedAt: z.string().optional().describe('Timestamp when the index was last updated'),
      previousUpdatedAt: z.string().optional().describe('Previous known update timestamp')
    })
  )
  .output(
    z.object({
      indexName: z.string().describe('Name of the affected index'),
      entries: z.number().optional().describe('Current number of records in the index'),
      updatedAt: z.string().optional().describe('Timestamp of the latest update'),
      dataSize: z.number().optional().describe('Size of the index data in bytes')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new AlgoliaClient({
        applicationId: ctx.auth.applicationId,
        token: ctx.auth.token,
        analyticsRegion: ctx.config.analyticsRegion
      });

      let result = await client.listIndices();
      let currentIndices: Record<string, any> = {};

      for (let item of result.items || []) {
        currentIndices[item.name] = {
          entries: item.entries,
          updatedAt: item.updatedAt,
          dataSize: item.dataSize
        };
      }

      let previousIndices: Record<string, any> = ctx.state?.indices || {};
      let inputs: Array<{
        changeType: 'created' | 'updated' | 'deleted';
        indexName: string;
        entries?: number;
        updatedAt?: string;
        previousUpdatedAt?: string;
      }> = [];

      // Detect new and updated indices
      for (let [name, data] of Object.entries(currentIndices)) {
        let prev = previousIndices[name];
        if (!prev) {
          inputs.push({
            changeType: 'created',
            indexName: name,
            entries: data.entries,
            updatedAt: data.updatedAt
          });
        } else if (prev.updatedAt !== data.updatedAt) {
          inputs.push({
            changeType: 'updated',
            indexName: name,
            entries: data.entries,
            updatedAt: data.updatedAt,
            previousUpdatedAt: prev.updatedAt
          });
        }
      }

      // Detect deleted indices
      for (let name of Object.keys(previousIndices)) {
        if (!currentIndices[name]) {
          inputs.push({
            changeType: 'deleted',
            indexName: name
          });
        }
      }

      return {
        inputs,
        updatedState: {
          indices: currentIndices
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `index.${ctx.input.changeType}`,
        id: `${ctx.input.indexName}-${ctx.input.updatedAt || ctx.input.changeType}-${Date.now()}`,
        output: {
          indexName: ctx.input.indexName,
          entries: ctx.input.entries,
          updatedAt: ctx.input.updatedAt,
          dataSize: undefined
        }
      };
    }
  })
  .build();
