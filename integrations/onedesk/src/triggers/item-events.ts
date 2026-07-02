import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let itemEvents = SlateTrigger.create(spec, {
  name: 'Work Item Events',
  key: 'item_events',
  description:
    'Triggers when a work item (ticket, task, etc.) is created or updated in OneDesk.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of item event.'),
      itemExternalId: z.string().describe('External ID of the affected item.'),
      itemName: z.string().describe('Name of the affected item.'),
      itemType: z.string().optional().describe('Type of the work item.'),
      timestamp: z.string().describe('Timestamp of when the event occurred.')
    })
  )
  .output(
    z.object({
      itemExternalId: z.string().describe('External ID of the work item.'),
      itemName: z.string().describe('Name of the work item.'),
      itemType: z.string().optional().describe('Type identifier of the work item.'),
      timestamp: z.string().describe('When the event occurred.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let state = ctx.input.state as { lastTimestamp?: string } | null;
      let lastTimestamp = state?.lastTimestamp;
      let now = new Date();
      let tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      let tomorrowStr = tomorrow.toISOString().split('T')[0]!;

      let timeFilter = lastTimestamp
        ? { property: 'creationTime', operation: 'GT', value: lastTimestamp }
        : { property: 'creationTime', operation: 'LT', value: tomorrowStr };

      let createdActivities: any[] = [];
      try {
        createdActivities = await client.searchActivities({
          properties: [
            { property: 'types', operation: 'EQ', value: 'CREATED_WORK_ITEM' },
            timeFilter
          ],
          isAsc: false,
          limit: 50,
          offset: 0
        });
      } catch (_e) {
        ctx.warn('Failed to fetch created item activities');
      }

      let updatedActivities: any[] = [];
      try {
        updatedActivities = await client.searchActivities({
          properties: [
            { property: 'types', operation: 'EQ', value: 'UPDATED_WORK_ITEM' },
            timeFilter
          ],
          isAsc: false,
          limit: 50,
          offset: 0
        });
      } catch (_e) {
        ctx.warn('Failed to fetch updated item activities');
      }

      let allActivities = [
        ...createdActivities.map((a: any) => ({ ...a, _eventType: 'created' as const })),
        ...updatedActivities.map((a: any) => ({ ...a, _eventType: 'updated' as const }))
      ];

      let latestTimestamp = lastTimestamp;
      for (let activity of allActivities) {
        let ts = activity.timestamp || activity.creationTime;
        if (ts && (!latestTimestamp || ts > latestTimestamp)) {
          latestTimestamp = ts;
        }
      }

      return {
        inputs: allActivities.map((activity: any) => ({
          eventType: activity._eventType,
          itemExternalId: activity.itemExternalId || activity.externalId || '',
          itemName: activity.itemName || activity.name || '',
          itemType: activity.itemType || activity.type,
          timestamp: activity.timestamp || activity.creationTime || ''
        })),
        updatedState: {
          lastTimestamp: latestTimestamp || lastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `work_item.${ctx.input.eventType}`,
        id: `${ctx.input.itemExternalId}-${ctx.input.timestamp}`,
        output: {
          itemExternalId: ctx.input.itemExternalId,
          itemName: ctx.input.itemName,
          itemType: ctx.input.itemType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
