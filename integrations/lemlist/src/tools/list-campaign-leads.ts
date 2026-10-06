import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, leadOutput } from '../lib/client';
import { spec } from '../spec';

export let listCampaignLeads = SlateTool.create(spec, {
  name: 'List Campaign Leads',
  key: 'list_campaign_leads',
  description: `Retrieve the list of leads enrolled in a specific campaign. Optionally filter by lead state such as contacted, interested, not interested, etc.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign'),
      state: z
        .string()
        .optional()
        .describe(
          'Filter leads by state (e.g., scanned, contacted, interested, notInterested, skipped)'
        ),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum leads to return, from 1 to 500; default 100. This endpoint does not document a continuation cursor or offset.'
        )
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.string(),
          email: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          companyName: z.string().optional(),
          jobTitle: z.string().optional(),
          isPaused: z.boolean().optional(),
          state: z.string().optional(),
          contactId: z.string().optional()
        })
      ),
      count: z.number().optional(),
      possiblyTruncated: z
        .boolean()
        .optional()
        .describe('The requested limit was reached; additional leads may exist.')
    })
  )
  .handleInvocation(async ctx => {
    const limit = ctx.input.limit ?? 100;
    const leads = (
      await new Client({ token: ctx.auth.token }).getCampaignLeads(ctx.input.campaignId, {
        state: ctx.input.state,
        limit
      })
    ).map(leadOutput);
    return {
      output: { leads, count: leads.length, possiblyTruncated: leads.length >= limit },
      message: `Retrieved **${leads.length}** campaign lead(s).${leads.length >= limit ? ' The requested limit was reached; this endpoint has no documented continuation cursor.' : ''}`
    };
  })
  .build();
