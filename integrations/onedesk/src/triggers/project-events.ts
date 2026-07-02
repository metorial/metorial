import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when a project is created or updated in OneDesk.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of project event.'),
      projectExternalId: z.string().describe('External ID of the project.'),
      projectName: z.string().describe('Name of the project.'),
      timestamp: z.string().describe('Timestamp of the event.')
    })
  )
  .output(
    z.object({
      projectExternalId: z.string().describe('External ID of the project.'),
      projectName: z.string().describe('Name of the project.'),
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
            { property: 'types', operation: 'EQ', value: 'CREATED_PROJECT' },
            timeFilter
          ],
          isAsc: false,
          limit: 50,
          offset: 0
        });
      } catch (_e) {
        ctx.warn('Failed to fetch created project activities');
      }

      let updatedActivities: any[] = [];
      try {
        updatedActivities = await client.searchActivities({
          properties: [
            { property: 'types', operation: 'EQ', value: 'UPDATED_PROJECT' },
            timeFilter
          ],
          isAsc: false,
          limit: 50,
          offset: 0
        });
      } catch (_e) {
        ctx.warn('Failed to fetch updated project activities');
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
          projectExternalId: activity.itemExternalId || activity.externalId || '',
          projectName: activity.itemName || activity.name || '',
          timestamp: activity.timestamp || activity.creationTime || ''
        })),
        updatedState: {
          lastTimestamp: latestTimestamp || lastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `project.${ctx.input.eventType}`,
        id: `${ctx.input.projectExternalId}-${ctx.input.timestamp}`,
        output: {
          projectExternalId: ctx.input.projectExternalId,
          projectName: ctx.input.projectName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
