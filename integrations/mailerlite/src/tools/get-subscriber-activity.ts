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
        .describe('Filter by activity type'),
      limit: z.number().optional().describe('Number of activity records to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
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

    let result = await client.getSubscriberActivity(ctx.input.subscriberId, {
      type: ctx.input.type,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let activities = (result.data || []).map((a: any) => ({
      activityId: a.id,
      type: a.type,
      timestamp: a.created_at || a.timestamp,
      details: a
    }));

    return {
      output: {
        activities,
        nextCursor: result.meta?.next_cursor || null
      },
      message: `Retrieved **${activities.length}** activity records for subscriber **${ctx.input.subscriberId}**.`
    };
  })
  .build();
