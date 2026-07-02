import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let notificationSchema = z.object({
  notificationId: z.string().optional().describe('Notification UUID'),
  contents: z.record(z.string(), z.string()).optional().describe('Localized message body'),
  headings: z.record(z.string(), z.string()).optional().describe('Localized message title'),
  name: z.string().optional().describe('Internal name'),
  successful: z.number().optional().describe('Number of successful deliveries'),
  failed: z.number().optional().describe('Number of failed deliveries'),
  errored: z.number().optional().describe('Number of errored deliveries'),
  received: z.number().optional().describe('Number confirmed received'),
  converted: z.number().optional().describe('Number of conversions'),
  remaining: z.number().optional().describe('Remaining deliveries'),
  queuedAt: z.string().optional().describe('Queued timestamp'),
  sendAfter: z.string().optional().describe('Scheduled send time'),
  completedAt: z.string().optional().describe('Completion timestamp'),
  targetChannel: z.string().optional().describe('Message channel (push, email, sms)'),
  includedSegments: z.array(z.string()).optional().describe('Targeted segments'),
  templateId: z.string().optional().describe('Template used'),
  platformDeliveryStats: z.any().optional().describe('Per-platform delivery statistics')
});

export let viewNotifications = SlateTool.create(spec, {
  name: 'View Notifications',
  key: 'view_notifications',
  description: `Retrieve notification details and delivery analytics. Can list recent notifications with pagination or fetch a specific notification by ID with detailed outcome metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notificationId: z
        .string()
        .optional()
        .describe(
          'Specific notification ID to retrieve. If omitted, lists recent notifications.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Number of notifications to return (max 50, default 50)'),
      offset: z.number().optional().describe('Pagination offset'),
      kind: z.number().optional().describe('Filter by kind: 0=dashboard, 1=API, 3=automated'),
      outcomeNames: z
        .array(z.string())
        .optional()
        .describe(
          'Outcome metrics to include, e.g. ["os__click.count", "os__confirmed_delivery.count"]'
        ),
      outcomeTimeRange: z
        .string()
        .optional()
        .describe('Time range for outcomes: "1h", "1d", "1mo"')
    })
  )
  .output(
    z.object({
      notification: notificationSchema.optional().describe('Single notification details'),
      notifications: z.array(notificationSchema).optional().describe('List of notifications'),
      totalCount: z.number().optional().describe('Total number of notifications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    if (ctx.input.notificationId) {
      let result = await client.getNotification(ctx.input.notificationId, {
        outcomeNames: ctx.input.outcomeNames,
        outcomeTimeRange: ctx.input.outcomeTimeRange
      });

      let notification = mapNotification(result);

      return {
        output: { notification },
        message: `Retrieved notification **${ctx.input.notificationId}**${notification.successful !== undefined ? ` — ${notification.successful} successful delivery(ies)` : ''}.`
      };
    }

    let result = await client.listNotifications({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      kind: ctx.input.kind
    });

    let notifications = (result.notifications || []).map(mapNotification);

    return {
      output: {
        notifications,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count ?? notifications.length}** notification(s). Returned ${notifications.length} in this page.`
    };
  })
  .build();

let mapNotification = (n: any) => ({
  notificationId: n.id,
  contents: n.contents,
  headings: n.headings,
  name: n.name,
  successful: n.successful,
  failed: n.failed,
  errored: n.errored,
  received: n.received,
  converted: n.converted,
  remaining: n.remaining,
  queuedAt: n.queued_at ? String(n.queued_at) : undefined,
  sendAfter: n.send_after ? String(n.send_after) : undefined,
  completedAt: n.completed_at ? String(n.completed_at) : undefined,
  targetChannel: n.target_channel,
  includedSegments: n.included_segments,
  templateId: n.template_id,
  platformDeliveryStats: n.platform_delivery_stats
});
