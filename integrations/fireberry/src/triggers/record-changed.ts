import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordChanged = SlateTrigger.create(spec, {
  name: 'Record Created or Updated',
  key: 'record_changed',
  description:
    'Triggers when records are created or updated across core Fireberry objects (accounts, contacts, opportunities, tickets, tasks). Polls for recently modified records.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was newly created or updated'),
      recordId: z.string().describe('GUID of the affected record'),
      objectType: z.string().describe('Object type system name'),
      objectTypeNumber: z.number().describe('Object type number'),
      record: z.record(z.string(), z.any()).describe('Full record data')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('GUID of the affected record'),
      objectType: z.string().describe('Object type system name (e.g., account, contact)'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was created or updated'),
      record: z.record(z.string(), z.any()).describe('Full record with all fields and values')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);

      let state = ctx.state as {
        lastPollTime?: string;
        seenRecordIds?: Record<string, string[]>;
      } | null;

      let lastPollTime = state?.lastPollTime;
      let seenRecordIds = state?.seenRecordIds ?? {};

      let objectTypes = [
        { number: 1, name: 'account' },
        { number: 2, name: 'contact' },
        { number: 4, name: 'opportunity' },
        { number: 5, name: 'cases' },
        { number: 10, name: 'task' }
      ];

      let allInputs: Array<{
        changeType: 'created' | 'updated';
        recordId: string;
        objectType: string;
        objectTypeNumber: number;
        record: Record<string, any>;
      }> = [];

      let newSeenRecordIds: Record<string, string[]> = {};

      for (let objectType of objectTypes) {
        try {
          let queryFilter = lastPollTime ? `(modifiedon >= '${lastPollTime}')` : undefined;

          let result = await client.query({
            objecttype: objectType.number,
            query: queryFilter,
            sort_by: 'modifiedon',
            sort_type: 'desc',
            page_size: 50,
            page_number: 1
          });

          let previousIds = seenRecordIds[objectType.name] ?? [];

          for (let record of result.Records) {
            let recordId = record[result.PrimaryKey] as string;
            if (!recordId) continue;

            let isNew = !previousIds.includes(recordId);

            allInputs.push({
              changeType: isNew ? 'created' : 'updated',
              recordId,
              objectType: objectType.name,
              objectTypeNumber: objectType.number,
              record
            });
          }

          newSeenRecordIds[objectType.name] = result.Records.map(
            r => r[result.PrimaryKey] as string
          ).filter(Boolean);
        } catch {
          // If an object type fails (e.g., no permission), skip it
          newSeenRecordIds[objectType.name] = seenRecordIds[objectType.name] ?? [];
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          seenRecordIds: newSeenRecordIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.objectType}.${ctx.input.changeType}`,
        id: `${ctx.input.objectType}-${ctx.input.recordId}-${ctx.input.record.modifiedon ?? Date.now()}`,
        output: {
          recordId: ctx.input.recordId,
          objectType: ctx.input.objectType,
          changeType: ctx.input.changeType,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
