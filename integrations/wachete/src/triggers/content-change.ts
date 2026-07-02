import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contentChange = SlateTrigger.create(spec, {
  name: 'Content Change',
  key: 'content_change',
  description:
    'Triggers when a monitored web page content changes or a monitoring error occurs.'
})
  .input(
    z.object({
      notificationId: z.string().describe('Notification ID'),
      alertType: z.string().describe('Alert type (e.g., NotEq, Error)'),
      current: z.string().optional().describe('Current content value'),
      comparand: z.string().optional().describe('Previous content value'),
      error: z.string().optional().describe('Error message if applicable'),
      timestamp: z.string().describe('When the notification was generated'),
      serverTime: z.string().describe('Server timestamp'),
      wachetId: z.string().describe('Monitor ID'),
      wachetName: z.string().optional().describe('Monitor name'),
      url: z.string().optional().describe('Monitored URL')
    })
  )
  .output(
    z.object({
      notificationId: z.string().describe('Notification ID'),
      alertType: z.string().describe('Alert type (e.g., NotEq, Error)'),
      current: z.string().optional().describe('Current content value'),
      comparand: z.string().optional().describe('Previous content value for comparison'),
      error: z.string().optional().describe('Error message if applicable'),
      timestamp: z.string().describe('When the change was detected'),
      wachetId: z.string().describe('Monitor ID that detected the change'),
      wachetName: z.string().optional().describe('Name of the monitor'),
      url: z.string().optional().describe('URL of the monitored page')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastTimestamp = ctx.state?.lastTimestamp as string | undefined;

      let params: {
        from?: string;
        count?: number;
      } = {
        count: 100
      };

      if (lastTimestamp) {
        params.from = lastTimestamp;
      }

      let response = await client.listNotifications(params);

      let notifications = response.data ?? [];

      // Filter out notifications we've already seen (from <= timestamp could include the boundary)
      if (lastTimestamp) {
        notifications = notifications.filter(n => n.timestamp > lastTimestamp);
      }

      let newLastTimestamp = lastTimestamp;
      if (notifications.length > 0) {
        // Find the most recent timestamp
        let maxTimestamp = notifications.reduce(
          (max, n) => (n.timestamp > max ? n.timestamp : max),
          notifications[0]!.timestamp
        );
        newLastTimestamp = maxTimestamp;
      }

      return {
        inputs: notifications.map(n => ({
          notificationId: n.id,
          alertType: n.type,
          current: n.current,
          comparand: n.comparand,
          error: n.error,
          timestamp: n.timestamp,
          serverTime: n.serverTime,
          wachetId: n.taskId,
          wachetName: n.taskName,
          url: n.url
        })),
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      let alertType = ctx.input.alertType?.toLowerCase() ?? 'change';
      return {
        type: `content.${alertType}`,
        id: ctx.input.notificationId,
        output: {
          notificationId: ctx.input.notificationId,
          alertType: ctx.input.alertType,
          current: ctx.input.current,
          comparand: ctx.input.comparand,
          error: ctx.input.error,
          timestamp: ctx.input.timestamp,
          wachetId: ctx.input.wachetId,
          wachetName: ctx.input.wachetName,
          url: ctx.input.url
        }
      };
    }
  })
  .build();
