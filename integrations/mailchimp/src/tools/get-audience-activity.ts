import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let getAudienceActivityTool = SlateTool.create(spec, {
  name: 'Get Audience Activity',
  key: 'get_audience_activity',
  description: `Retrieve recent activity and growth history for an audience. Shows daily stats including subscribes, unsubscribes, email activity, and audience growth over time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      includeGrowthHistory: z
        .boolean()
        .optional()
        .describe('Also include monthly growth history (default false)')
    })
  )
  .output(
    z.object({
      activity: z.array(
        z.object({
          day: z.string(),
          emailsSent: z.number(),
          uniqueOpens: z.number(),
          recipientClicks: z.number(),
          hardBounces: z.number(),
          softBounces: z.number(),
          subscribes: z.number(),
          unsubscribes: z.number(),
          otherAdds: z.number(),
          otherRemoves: z.number()
        })
      ),
      growthHistory: z
        .array(
          z.object({
            month: z.string(),
            existing: z.number(),
            imports: z.number(),
            optins: z.number()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let activityResult = await client.getListActivity(ctx.input.listId);
    let activity = (activityResult.activity ?? []).map((a: any) => ({
      day: a.day,
      emailsSent: a.emails_sent ?? 0,
      uniqueOpens: a.unique_opens ?? 0,
      recipientClicks: a.recipient_clicks ?? 0,
      hardBounces: a.hard_bounce ?? 0,
      softBounces: a.soft_bounce ?? 0,
      subscribes: a.subs ?? 0,
      unsubscribes: a.unsubs ?? 0,
      otherAdds: a.other_adds ?? 0,
      otherRemoves: a.other_removes ?? 0
    }));

    let growthHistory: any[] | undefined;
    if (ctx.input.includeGrowthHistory) {
      let growthResult = await client.getListGrowthHistory(ctx.input.listId);
      growthHistory = (growthResult.history ?? []).map((h: any) => ({
        month: h.month,
        existing: h.existing ?? 0,
        imports: h.imports ?? 0,
        optins: h.optins ?? 0
      }));
    }

    return {
      output: {
        activity,
        growthHistory
      },
      message: `Retrieved **${activity.length}** day(s) of activity for audience ${ctx.input.listId}.${growthHistory ? ` Also included ${growthHistory.length} month(s) of growth history.` : ''}`
    };
  })
  .build();
