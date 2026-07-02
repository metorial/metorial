import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getCampaignLeads(ctx.input.campaignId, {
      state: ctx.input.state
    });

    let leads = (Array.isArray(data) ? data : []).map((l: any) => ({
      leadId: l._id,
      email: l.email,
      firstName: l.firstName,
      lastName: l.lastName,
      companyName: l.companyName,
      jobTitle: l.jobTitle,
      isPaused: l.isPaused,
      state: l.state,
      contactId: l.contactId
    }));

    return {
      output: { leads },
      message: `Found **${leads.length}** lead(s) in campaign \`${ctx.input.campaignId}\`${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  })
  .build();
