import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let moderateContent = SlateTool.create(spec, {
  name: 'Moderate Content',
  key: 'moderate_content',
  description: `Perform moderation actions on posts and comments in subreddits you moderate.
Supports approving, removing, distinguishing content, and viewing the mod queue, mod log, and reports.`,
  instructions: [
    'Use action "approve", "remove", or "distinguish" with a post or comment fullname to moderate content.',
    'Use action "mod_queue", "reports", or "mod_log" with a subreddit name to view moderation queues.',
    'For "remove", optionally mark as spam.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['approve', 'remove', 'distinguish', 'mod_queue', 'reports', 'mod_log'])
        .describe('Moderation action to perform'),
      thingId: z
        .string()
        .optional()
        .describe(
          'Fullname of the post (t3_*) or comment (t1_*) for approve/remove/distinguish'
        ),
      subredditName: z
        .string()
        .optional()
        .describe('Subreddit name for mod_queue/reports/mod_log'),
      isSpam: z.boolean().optional().describe('Mark as spam when removing (default: false)'),
      distinguishType: z
        .enum(['yes', 'no', 'admin', 'special'])
        .optional()
        .describe('Distinguish type (default: yes)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of items to return for queue/log (max 100)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      items: z
        .array(
          z.object({
            thingId: z.string().describe('Item fullname'),
            title: z.string().optional().describe('Title (for posts)'),
            body: z.string().optional().describe('Body text (for comments)'),
            author: z.string().optional().describe('Author username'),
            subredditName: z.string().optional().describe('Subreddit name'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            numReports: z.number().optional().describe('Number of reports')
          })
        )
        .optional()
        .describe('Items from mod queue, reports, or mod log')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'approve') {
      let thingId = requireRedditInput(
        ctx.input.thingId,
        'thingId is required for approve action'
      );
      await client.approve(thingId);
      return {
        output: { success: true },
        message: `Approved \`${thingId}\`.`
      };
    }

    if (action === 'remove') {
      let thingId = requireRedditInput(
        ctx.input.thingId,
        'thingId is required for remove action'
      );
      await client.remove(thingId, ctx.input.isSpam ?? false);
      return {
        output: { success: true },
        message: `Removed \`${thingId}\`${ctx.input.isSpam ? ' (marked as spam)' : ''}.`
      };
    }

    if (action === 'distinguish') {
      let thingId = requireRedditInput(
        ctx.input.thingId,
        'thingId is required for distinguish action'
      );
      await client.distinguish(thingId, ctx.input.distinguishType ?? 'yes');
      return {
        output: { success: true },
        message: `Distinguished \`${thingId}\` as ${ctx.input.distinguishType ?? 'yes'}.`
      };
    }

    let listParams = { limit: ctx.input.limit ?? 25 };
    let data: any;
    let subredditName = requireRedditInput(
      ctx.input.subredditName,
      `subredditName is required for ${action} action`
    );

    if (action === 'mod_queue') {
      data = await client.getModQueue(subredditName, listParams);
    } else if (action === 'reports') {
      data = await client.getReports(subredditName, listParams);
    } else {
      data = await client.getModLog(subredditName, listParams);
    }

    let children = data?.data?.children ?? [];
    let items = children.map((c: any) => {
      let d = c.data;
      return {
        thingId: d.name ?? d.id,
        title: d.title,
        body: d.body,
        author: d.author,
        subredditName: d.subreddit,
        createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        numReports: d.num_reports
      };
    });

    return {
      output: {
        success: true,
        items
      },
      message: `Retrieved ${items.length} items from ${action.replace('_', ' ')} in r/${subredditName}.`
    };
  })
  .build();
