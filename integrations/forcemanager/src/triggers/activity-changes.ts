import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityChanges = SlateTrigger.create(spec, {
  name: 'Activity Changes',
  key: 'activity_changes',
  description:
    'Triggers when sales activities (visits, calls, meetings) are created or updated in ForceManager.'
})
  .input(
    z.object({
      activityId: z.number().describe('Activity ID'),
      record: z.any().describe('Full activity record'),
      detectedAt: z.string().describe('Timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Activity ID'),
      activityTypeId: z.any().nullable().describe('Activity type'),
      accountId: z.any().nullable().describe('Associated account'),
      contactId: z.any().nullable().describe('Associated contact'),
      salesRepId: z.any().nullable().describe('Sales rep who performed the activity'),
      comment: z.string().nullable().describe('Activity comments'),
      activityDateTime: z.string().nullable().describe('Activity date/time'),
      dateCreated: z.string().nullable().describe('Record creation date'),
      dateUpdated: z.string().nullable().describe('Record last update date'),
      record: z.any().describe('Full activity record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth);
      let lastPollTime = ctx.state?.lastPollTime || new Date().toISOString().replace('Z', '');

      let allRecords: any[] = [];
      let page: number | undefined = 0;
      let maxPages = 10;

      while (page !== undefined && page !== null && maxPages > 0) {
        let result = await client.listModifiedSince('activities', lastPollTime, page);
        allRecords.push(...result.records);
        page = result.nextPage !== null ? result.nextPage : undefined;
        maxPages--;
      }

      let now = new Date().toISOString().replace('Z', '');

      return {
        inputs: allRecords.map(record => ({
          activityId: record.id,
          record,
          detectedAt: now
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let record = ctx.input.record;
      let isNew = record.dateCreated === record.dateUpdated;

      return {
        type: isNew ? 'activity.created' : 'activity.updated',
        id: `activity-${ctx.input.activityId}-${ctx.input.detectedAt}`,
        output: {
          activityId: ctx.input.activityId,
          activityTypeId: record.activityTypeId || null,
          accountId: record.accountId || null,
          contactId: record.contactId || null,
          salesRepId: record.salesRepId || null,
          comment: record.comment || null,
          activityDateTime: record.activityDateTime || null,
          dateCreated: record.dateCreated || null,
          dateUpdated: record.dateUpdated || null,
          record
        }
      };
    }
  })
  .build();
