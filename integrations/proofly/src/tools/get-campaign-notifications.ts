import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prooflyBoolean, prooflyId, prooflyNumber, prooflyString } from '../lib/response';
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
      campaignId: z
        .string()
        .describe('Campaign ID. Call list_campaigns to discover campaign IDs.')
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
            leads: z.number().optional().describe('Number of leads collected'),
            name: z.string().optional().describe('Notification name'),
            enabled: z.boolean().optional().describe('Whether the notification is enabled'),
            createdAt: z.string().optional().describe('Notification creation timestamp'),
            settings: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Notification display and targeting settings')
          })
        )
        .describe('Notifications within the campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let notifications = await client.getCampaignNotifications(ctx.input.campaignId);

    return {
      output: {
        notifications: notifications.map(n => {
          let stats = isApiErrorRecord(n.stats) ? n.stats : {};
          return {
            notificationId: prooflyId(n.id ?? n._id ?? n.notificationId, 'notification'),
            notificationType: prooflyString(n.type, n.notificationType, n.notification_type),
            impressions: prooflyNumber(n.impressions, stats.impressions),
            hovers: prooflyNumber(n.hovers, stats.hovers),
            clicks: prooflyNumber(n.clicks, stats.clicks),
            leads: prooflyNumber(n.leads, stats.leads),
            name: prooflyString(n.name),
            enabled: prooflyBoolean(n.enabled),
            createdAt: prooflyString(n.created),
            settings: isApiErrorRecord(n.settings) ? n.settings : undefined
          };
        })
      },
      message: `Retrieved **${notifications.length}** notification(s) for campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
