import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Triggers when Salesforce records of a specified object type are created, updated, or deleted. Polls for changes periodically using the updated and deleted records endpoints. Configure the object type, whether to track deletes, and optional fields to retrieve via the initial state.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('The type of change detected'),
      recordId: z.string().describe('ID of the changed record'),
      objectType: z.string().describe('The Salesforce object type'),
      timestamp: z.string().describe('Timestamp of the change'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full record data (for created/updated records)')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('ID of the changed record'),
      objectType: z.string().describe('The Salesforce object type that changed'),
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Whether the record was created, updated, or deleted'),
      timestamp: z.string().describe('When the change occurred'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full record data (available for created/updated records, not for deleted)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createSalesforceClient({
        instanceUrl: ctx.auth.instanceUrl,
        apiVersion: ctx.config.apiVersion,
        token: ctx.auth.token
      });

      let state = ctx.input.state || {};
      let now = new Date();
      let lastPoll = state.lastPollTimestamp
        ? (state.lastPollTimestamp as string)
        : new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      let startTime = formatSalesforceDateTime(lastPoll);
      let endTime = formatSalesforceDateTime(now.toISOString());
      let objectType = (state.objectType as string) || 'Account';
      let trackDeletes = (state.trackDeletes as boolean) || false;
      let fields = state.fields as string[] | undefined;

      let inputs: any[] = [];

      let updatedResult = await client.getUpdatedRecords(objectType, startTime, endTime);
      let updatedIds: string[] = updatedResult.ids || [];

      if (updatedIds.length > 0) {
        let knownIds = (state.knownRecordIds as string[]) || [];
        let knownSet = new Set(knownIds);

        for (let recordId of updatedIds) {
          let changeType: 'created' | 'updated' = knownSet.has(recordId)
            ? 'updated'
            : 'created';

          let record: Record<string, any> | undefined;
          if (fields && fields.length > 0) {
            try {
              record = await client.getRecord(objectType, recordId, fields);
            } catch {
              // Record may have been deleted between polling intervals
            }
          }

          inputs.push({
            changeType,
            recordId,
            objectType,
            timestamp: updatedResult.latestDateCovered || now.toISOString(),
            record
          });
        }
      }

      if (trackDeletes) {
        let deletedResult = await client.getDeletedRecords(objectType, startTime, endTime);
        let deletedRecords: any[] = deletedResult.deletedRecords || [];

        for (let deleted of deletedRecords) {
          inputs.push({
            changeType: 'deleted' as const,
            recordId: deleted.id,
            objectType,
            timestamp: deleted.deletedDate || now.toISOString(),
            record: undefined
          });
        }
      }

      let allKnownIds = new Set<string>((state.knownRecordIds as string[]) || []);
      for (let input of inputs) {
        if (input.changeType !== 'deleted') {
          allKnownIds.add(input.recordId);
        } else {
          allKnownIds.delete(input.recordId);
        }
      }

      let knownIdsArray = Array.from(allKnownIds);
      if (knownIdsArray.length > 10000) {
        knownIdsArray = knownIdsArray.slice(-10000);
      }

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: now.toISOString(),
          objectType,
          trackDeletes,
          fields,
          knownRecordIds: knownIdsArray
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.objectType.toLowerCase()}.${ctx.input.changeType}`,
        id: `${ctx.input.recordId}-${ctx.input.timestamp}`,
        output: {
          recordId: ctx.input.recordId,
          objectType: ctx.input.objectType,
          changeType: ctx.input.changeType,
          timestamp: ctx.input.timestamp,
          record: ctx.input.record
        }
      };
    }
  })
  .build();

let formatSalesforceDateTime = (isoString: string): string => {
  let date = new Date(isoString);
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
};
