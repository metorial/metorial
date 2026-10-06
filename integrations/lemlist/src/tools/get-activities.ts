import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalBoolean, optionalNumber, optionalText, text } from '../lib/client';
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
    const client = new Client({ token: ctx.auth.token });
    const data = await client.getActivities(ctx.input);
    const activities = data.map(a => ({
      activityId: text(a._id),
      type: text(a.type, 'activity type'),
      leadId: optionalText(a.leadId),
      campaignId: optionalText(a.campaignId),
      campaignName: optionalText(a.campaignName),
      createdAt: optionalText(a.createdAt),
      leadEmail: optionalText(a.leadEmail),
      leadFirstName: optionalText(a.leadFirstName),
      leadLastName: optionalText(a.leadLastName),
      leadCompanyName: optionalText(a.leadCompanyName),
      sequenceStep: optionalNumber(a.sequenceStep),
      userName: optionalText(a.userName),
      isFirst: optionalBoolean(a.isFirst),
      errorMessage: optionalText(a.errorMessage)
    }));
    return {
      output: { activities },
      message: `Retrieved **${activities.length}** activities in this page.`
    };
  })
  .build();
