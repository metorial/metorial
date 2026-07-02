import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivities = SlateTool.create(spec, {
  name: 'Get Activities',
  key: 'get_activities',
  description: `Retrieve activity logs for campaigns and leads. Filter by activity type (email, LinkedIn, phone, API events), campaign, or lead. Returns events like sends, opens, clicks, replies, bounces, and more.`,
  instructions: [
    'Use the "type" filter for specific activity types like emailsSent, emailsOpened, emailsClicked, emailsReplied, emailsBounced, linkedinInviteDone, linkedinReplied, aircallDone, etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .string()
        .optional()
        .describe(
          'Activity type filter (e.g., emailsSent, emailsOpened, emailsClicked, emailsReplied, emailsBounced, linkedinInviteDone, linkedinReplied, aircallDone)'
        ),
      campaignId: z.string().optional().describe('Filter activities by campaign ID'),
      leadId: z.string().optional().describe('Filter activities by lead ID'),
      isFirst: z
        .boolean()
        .optional()
        .describe('Only return the first activity of its type per lead'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string(),
          type: z.string(),
          leadId: z.string().optional(),
          campaignId: z.string().optional(),
          campaignName: z.string().optional(),
          createdAt: z.string().optional(),
          leadEmail: z.string().optional(),
          leadFirstName: z.string().optional(),
          leadLastName: z.string().optional(),
          leadCompanyName: z.string().optional(),
          sequenceStep: z.number().optional(),
          userName: z.string().optional(),
          isFirst: z.boolean().optional(),
          errorMessage: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getActivities({
      type: ctx.input.type,
      campaignId: ctx.input.campaignId,
      leadId: ctx.input.leadId,
      isFirst: ctx.input.isFirst,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let activities = (Array.isArray(data) ? data : []).map((a: any) => ({
      activityId: a._id,
      type: a.type,
      leadId: a.leadId,
      campaignId: a.campaignId,
      campaignName: a.campaignName,
      createdAt: a.createdAt,
      leadEmail: a.leadEmail,
      leadFirstName: a.leadFirstName,
      leadLastName: a.leadLastName,
      leadCompanyName: a.leadCompanyName,
      sequenceStep: a.sequenceStep,
      userName: a.userName,
      isFirst: a.isFirst,
      errorMessage: a.errorMessage
    }));

    return {
      output: { activities },
      message: `Retrieved **${activities.length}** activit${activities.length === 1 ? 'y' : 'ies'}${ctx.input.type ? ` of type "${ctx.input.type}"` : ''}.`
    };
  })
  .build();
