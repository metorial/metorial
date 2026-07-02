import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignNotifications = SlateTool.create(spec, {
  name: 'Get Campaign Notifications',
  key: 'get_campaign_notifications',
  description: `Retrieve all notifications within a specific campaign, including notification type, display settings, trigger rules, and performance statistics (impressions, hovers, clicks, leads). Use **List Campaigns** first to obtain the campaign ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to retrieve notifications for')
    })
  )
  .output(
    z.object({
      notifications: z
        .array(
          z.object({
            notificationId: z.string().describe('Unique notification identifier'),
            notificationType: z
              .string()
              .optional()
              .describe('Type of notification (e.g., LATEST_CONVERSION)'),
            impressions: z
              .number()
              .optional()
              .describe('Number of times the notification was displayed'),
            hovers: z.number().optional().describe('Number of hover interactions'),
            clicks: z.number().optional().describe('Number of click interactions'),
            leads: z.number().optional().describe('Number of leads collected')
          })
        )
        .describe('Notifications within the campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCampaignNotifications(ctx.input.campaignId);

    let notifications = Array.isArray(data) ? data : (data.notifications ?? []);

    return {
      output: {
        notifications: notifications.map((n: any) => ({
          notificationId: String(n.id ?? n._id ?? n.notificationId),
          notificationType: n.type ?? n.notificationType ?? n.notification_type,
          impressions: n.impressions ?? n.stats?.impressions,
          hovers: n.hovers ?? n.stats?.hovers,
          clicks: n.clicks ?? n.stats?.clicks,
          leads: n.leads ?? n.stats?.leads
        }))
      },
      message: `Retrieved **${notifications.length}** notification(s) for campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
