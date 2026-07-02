import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let recordChanged = SlateTrigger.create(spec, {
  name: 'Record Changed',
  key: 'record_changed',
  description:
    'Triggers when records in a specified Dynamics 365 entity are created or modified. Polls for records with a modifiedon timestamp newer than the last check. Detects both new records (createdon equals modifiedon) and updated records.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was created or updated'),
      recordId: z.string().describe('GUID of the affected record'),
      entitySetName: z.string().describe('Entity set name where the change occurred'),
      modifiedOn: z.string().describe('Timestamp when the record was last modified'),
      createdOn: z.string().describe('Timestamp when the record was created'),
      record: z.any().describe('Full record data')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('GUID of the affected record'),
      entitySetName: z.string().describe('Entity set name where the change occurred'),
      modifiedOn: z.string().describe('When the record was last modified'),
      createdOn: z.string().describe('When the record was created'),
      record: z.record(z.string(), z.any()).describe('Full record data from Dynamics 365')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DynamicsClient({
        token: ctx.auth.token,
        instanceUrl: resolveDynamicsInstanceUrl(ctx)
      });

      let entitySetName = ctx.input.state?.entitySetName || 'accounts';
      let lastPolled =
        ctx.input.state?.lastPolled || new Date(Date.now() - 60000).toISOString();

      let result = await client.getModifiedRecords(entitySetName, lastPolled, {
        top: 50,
        orderBy: 'modifiedon asc'
      });

      let inputs = result.records.map((record: any) => {
        let createdOn = record.createdon || '';
        let modifiedOn = record.modifiedon || '';
        let isNew = createdOn === modifiedOn;

        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          recordId:
            record[
              Object.keys(record).find(
                k => k.endsWith('id') && !k.startsWith('_') && !k.startsWith('@')
              ) || ''
            ] || '',
          entitySetName,
          modifiedOn,
          createdOn,
          record
        };
      });

      let newLastPolled =
        result.records.length > 0
          ? result.records[result.records.length - 1].modifiedon || lastPolled
          : lastPolled;

      return {
        inputs,
        updatedState: {
          entitySetName,
          lastPolled: newLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `record.${ctx.input.eventType}`,
        id: `${ctx.input.entitySetName}-${ctx.input.recordId}-${ctx.input.modifiedOn}`,
        output: {
          recordId: ctx.input.recordId,
          entitySetName: ctx.input.entitySetName,
          modifiedOn: ctx.input.modifiedOn,
          createdOn: ctx.input.createdOn,
          record: ctx.input.record
        }
      };
    }
  })
  .build();
