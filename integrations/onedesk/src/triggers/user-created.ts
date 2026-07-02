import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userCreated = SlateTrigger.create(spec, {
  name: 'New User Created',
  key: 'user_created',
  description: 'Triggers when a new user or customer is created in OneDesk.'
})
  .input(
    z.object({
      userExternalId: z.string().describe('External ID of the new user.'),
      userName: z.string().describe('Name of the new user.'),
      timestamp: z.string().describe('Timestamp of when the user was created.')
    })
  )
  .output(
    z.object({
      userExternalId: z.string().describe('External ID of the new user.'),
      userName: z.string().describe('Name of the new user.'),
      timestamp: z.string().describe('When the user was created.')
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

      let activities: any[] = [];
      try {
        activities = await client.searchActivities({
          properties: [
            { property: 'types', operation: 'EQ', value: 'CREATED_USER' },
            timeFilter
          ],
          isAsc: false,
          limit: 50,
          offset: 0
        });
      } catch (_e) {
        ctx.warn('Failed to fetch new user activities');
      }

      let latestTimestamp = lastTimestamp;
      for (let activity of activities) {
        let ts = activity.timestamp || activity.creationTime;
        if (ts && (!latestTimestamp || ts > latestTimestamp)) {
          latestTimestamp = ts;
        }
      }

      return {
        inputs: activities.map((activity: any) => ({
          userExternalId: activity.itemExternalId || activity.externalId || '',
          userName: activity.itemName || activity.name || '',
          timestamp: activity.timestamp || activity.creationTime || ''
        })),
        updatedState: {
          lastTimestamp: latestTimestamp || lastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'user.created',
        id: `${ctx.input.userExternalId}-${ctx.input.timestamp}`,
        output: {
          userExternalId: ctx.input.userExternalId,
          userName: ctx.input.userName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
