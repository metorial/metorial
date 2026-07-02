import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let teamNotifications = SlateTrigger.create(spec, {
  name: 'Team Notifications',
  key: 'team_notifications',
  description:
    'Polls for new webhook notifications sent to a team. Covers video events (added, removed, primary change, project move, subtitles published/unpublished) and member events (added, removed, profile changed).'
})
  .input(
    z.object({
      notificationNumber: z.number().describe('Sequential notification number'),
      eventType: z.string().describe('Event type from the notification data'),
      timestamp: z.string().describe('Notification timestamp'),
      teamSlug: z.string().describe('Team slug'),
      eventData: z.record(z.string(), z.any()).describe('Full notification event data')
    })
  )
  .output(
    z.object({
      notificationNumber: z.number().describe('Sequential notification number'),
      eventType: z
        .string()
        .describe('Event type (e.g. video-added, subtitles-published, member-added)'),
      timestamp: z.string().describe('When the notification was sent'),
      teamSlug: z.string().describe('Team slug'),
      videoId: z.string().nullable().describe('Related video ID if applicable'),
      languageCode: z.string().nullable().describe('Related language code if applicable'),
      username: z.string().nullable().describe('Related username if applicable')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let teamSlug = ctx.state?.teamSlug;
      if (!teamSlug) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let client = new Client({
        token: ctx.auth.token,
        username: ctx.auth.username
      });

      let lastNumber = ctx.state?.lastNotificationNumber ?? 0;

      let result = await client.listNotifications(teamSlug, { limit: 50 });

      let newNotifications = result.objects.filter(n => n.number > lastNumber);

      let inputs = newNotifications.map(n => ({
        notificationNumber: n.number,
        eventType: n.data?.event || n.data?.type || 'unknown',
        timestamp: n.timestamp,
        teamSlug,
        eventData: n.data
      }));

      let maxNumber = lastNumber;
      for (let n of newNotifications) {
        if (n.number > maxNumber) {
          maxNumber = n.number;
        }
      }

      return {
        inputs,
        updatedState: {
          teamSlug,
          lastNotificationNumber: maxNumber
        }
      };
    },
    handleEvent: async ctx => {
      let eventData = ctx.input.eventData || {};

      return {
        type: `notification.${ctx.input.eventType}`,
        id: `${ctx.input.teamSlug}-notification-${ctx.input.notificationNumber}`,
        output: {
          notificationNumber: ctx.input.notificationNumber,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          teamSlug: ctx.input.teamSlug,
          videoId: (eventData.video_id || eventData.video || null) as string | null,
          languageCode: (eventData.language_code || eventData.language || null) as
            | string
            | null,
          username: (eventData.username || eventData.user || null) as string | null
        }
      };
    }
  })
  .build();
