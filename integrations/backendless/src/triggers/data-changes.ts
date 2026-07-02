import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let dataChanges = SlateTrigger.create(spec, {
  name: 'Data Changes',
  key: 'data_changes',
  description:
    'Triggers when objects are created or updated in a Backendless database table. Polls for new and recently modified records using the `created` and `updated` timestamps.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the object was created or updated'),
      objectId: z.string().describe('The objectId of the affected record'),
      record: z.record(z.string(), z.unknown()).describe('The full record data'),
      tableName: z.string().describe('Name of the table the record belongs to')
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('The objectId of the affected record'),
      tableName: z.string().describe('Name of the table'),
      record: z
        .record(z.string(), z.unknown())
        .describe('The full record data including all properties'),
      createdAt: z.string().optional().describe('ISO timestamp when the record was created'),
      updatedAt: z
        .string()
        .optional()
        .describe('ISO timestamp when the record was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BackendlessClient({
        applicationId: ctx.auth.applicationId,
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain,
        region: ctx.config.region
      });

      let tableName = (ctx.state?.tableName as string) || 'data';
      let lastPollTime = (ctx.state?.lastPollTime as number) || Date.now() - 60000;

      let inputs: Array<{
        eventType: 'created' | 'updated';
        objectId: string;
        record: Record<string, unknown>;
        tableName: string;
      }> = [];

      let newLastPollTime = lastPollTime;

      try {
        let createdObjects = await client.queryObjects(tableName, {
          where: `created > ${lastPollTime}`,
          sortBy: ['created'],
          pageSize: 100
        });

        for (let obj of createdObjects) {
          let createdTs = obj.created as number;
          inputs.push({
            eventType: 'created',
            objectId: obj.objectId as string,
            record: obj,
            tableName
          });
          if (createdTs > newLastPollTime) {
            newLastPollTime = createdTs;
          }
        }

        let updatedObjects = await client.queryObjects(tableName, {
          where: `updated > ${lastPollTime} AND updated != created`,
          sortBy: ['updated'],
          pageSize: 100
        });

        for (let obj of updatedObjects) {
          let updatedTs = obj.updated as number;
          inputs.push({
            eventType: 'updated',
            objectId: obj.objectId as string,
            record: obj,
            tableName
          });
          if (updatedTs > newLastPollTime) {
            newLastPollTime = updatedTs;
          }
        }
      } catch (err) {
        ctx.error(`Failed to poll for data changes: ${String(err)}`);
      }

      return {
        inputs,
        updatedState: {
          tableName,
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let created = ctx.input.record.created as number | undefined;
      let updated = ctx.input.record.updated as number | undefined;

      return {
        type: `data.${ctx.input.eventType}`,
        id: `${ctx.input.tableName}-${ctx.input.objectId}-${ctx.input.eventType}-${updated || created || Date.now()}`,
        output: {
          objectId: ctx.input.objectId,
          tableName: ctx.input.tableName,
          record: ctx.input.record,
          createdAt: created ? new Date(created).toISOString() : undefined,
          updatedAt: updated ? new Date(updated).toISOString() : undefined
        }
      };
    }
  })
  .build();
