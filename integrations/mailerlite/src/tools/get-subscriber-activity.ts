import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriberActivity = SlateTool.create(spec, {
  name: 'Get Subscriber Activity',
  key: 'get_subscriber_activity',
  description: `Retrieves activity logs for a specific subscriber, including email opens, link clicks, group changes, bounces, and more. Useful for tracking subscriber engagement.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberId: z.string().describe('ID of the subscriber'),
      type: z
        .enum(['opens', 'clicks', 'junks', 'bounces', 'unsubscribes', 'forwards', 'sent'])
        .optional()
        .describe(
          'Deprecated activity filter. Use activityLogName for current MailerLite log names.'
        ),
      activityLogName: z
        .enum([
          'campaign_send',
          'automation_email_sent',
          'email_open',
          'link_click',
          'email_bounce',
          'spam_complaint',
          'unsubscribed',
          'email_forward',
          'marketing_preferences_change',
          'preference_center'
        ])
        .optional()
        .describe('Filter by current MailerLite activity log_name value'),
      limit: z.number().optional().describe('Number of activity records to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.string().optional().describe('Activity record ID'),
            type: z.string().optional().describe('Type of activity'),
            timestamp: z.string().optional().describe('When the activity occurred'),
            details: z.any().optional().describe('Additional activity details')
          })
        )
        .describe('List of activity records'),
      nextCursor: z.string().optional().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let legacyLogNameMap: Record<string, string> = {
      opens: 'email_open',
      clicks: 'link_click',
      junks: 'spam_complaint',
      bounces: 'email_bounce',
      unsubscribes: 'unsubscribed',
      forwards: 'email_forward',
      sent: 'campaign_send'
    };
    let logName =
      ctx.input.activityLogName ??
      (ctx.input.type ? legacyLogNameMap[ctx.input.type] : undefined);

    let result = await client.getSubscriberActivity(ctx.input.subscriberId, {
      logName,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let activities = (result.data || []).map((a: any) => ({
      activityId: a.id,
      type: a.log_name,
      timestamp: a.created_at || a.timestamp,
      details: a
    }));

    return {
      output: {
        activities,
        nextCursor: null
      },
      message: `Retrieved **${activities.length}** activity records for subscriber **${ctx.input.subscriberId}**.`
    };
  })
  .build();
