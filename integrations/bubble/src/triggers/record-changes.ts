import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Detects new and modified records across all exposed Bubble data types by polling. Discovers exposed data types from the Swagger spec and tracks changes based on the Modified Date field.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was newly created or updated since last poll.'),
      dataType: z.string().describe('The Bubble data type name this record belongs to.'),
      record: z.record(z.string(), z.any()).describe('The full record data from Bubble.')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Unique ID of the changed record.'),
      recordType: z.string().describe('The Bubble data type name of the record.'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was newly created or modified.'),
      createdDate: z
        .string()
        .describe('ISO timestamp when the record was originally created.'),
      modifiedDate: z.string().describe('ISO timestamp when the record was last modified.'),
      fields: z.record(z.string(), z.any()).describe('All field values of the record.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        baseUrl: ctx.config.appBaseUrl,
        token: ctx.auth?.token
      });

      let state = (ctx.state ?? {}) as {
        lastPollTimes?: Record<string, string>;
        knownRecordIds?: string[];
        dataTypes?: string[];
      };

      let lastPollTimes = state.lastPollTimes ?? {};
      let knownRecordIds = state.knownRecordIds ?? [];

      let dataTypes: string[] = state.dataTypes ?? [];

      // Discover data types from Swagger spec if we don't have them yet
      if (dataTypes.length === 0) {
        try {
          let swaggerSpec = await client.getSwaggerSpec();
          let paths = swaggerSpec.paths ?? {};
          for (let path of Object.keys(paths)) {
            let match = path.match(/^\/obj\/([^/]+)$/);
            if (match?.[1]) {
              dataTypes.push(decodeURIComponent(match[1]));
            }
          }
        } catch {
          // Swagger may not be enabled; no data types discovered
        }
      }

      let allInputs: {
        changeType: 'created' | 'updated';
        dataType: string;
        record: Record<string, any>;
      }[] = [];
      let knownSet = new Set(knownRecordIds);
      let updatedPollTimes = { ...lastPollTimes };

      for (let dataType of dataTypes) {
        let lastPollTime = lastPollTimes[dataType];
        let constraints: any[] = [];

        if (lastPollTime) {
          constraints.push({
            key: 'Modified Date',
            constraint_type: 'greater than',
            value: lastPollTime
          });
        }

        try {
          let result = await client.searchRecords(dataType, {
            constraints: constraints.length > 0 ? constraints : undefined,
            sortField: 'Modified Date',
            descending: true,
            limit: 100
          });

          if (result.results.length > 0 && result.results[0]) {
            updatedPollTimes[dataType] = result.results[0]['Modified Date'];
          }

          for (let record of result.results) {
            let isNew = !knownSet.has(record._id);
            allInputs.push({
              changeType: isNew ? 'created' : 'updated',
              dataType,
              record
            });
            knownSet.add(record._id);
          }
        } catch {
          // Skip data types that fail (may not be accessible)
        }
      }

      let updatedKnownIds = [...knownSet];
      if (updatedKnownIds.length > 10000) {
        updatedKnownIds = updatedKnownIds.slice(-5000);
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTimes: updatedPollTimes,
          knownRecordIds: updatedKnownIds,
          dataTypes
        }
      };
    },

    handleEvent: async ctx => {
      let record = ctx.input.record;

      return {
        type: `record.${ctx.input.changeType}`,
        id: `${record._id}-${record['Modified Date']}`,
        output: {
          recordId: record._id,
          recordType: ctx.input.dataType,
          changeType: ctx.input.changeType,
          createdDate: record['Created Date'] || '',
          modifiedDate: record['Modified Date'] || '',
          fields: record
        }
      };
    }
  })
  .build();
