import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Look up a lead by email address across all campaigns. Returns all campaign enrollments, current status, custom variables, and enrichment data for the lead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address of the lead to look up')
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
          isPaused: z.boolean().optional(),
          state: z.string().optional(),
          status: z.string().optional(),
          contactId: z.string().optional(),
          campaignId: z.string().optional(),
          campaignName: z.string().optional(),
          campaignStatus: z.string().optional(),
          updatedAt: z.string().optional(),
          variables: z.record(z.string(), z.any()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getLeadByEmail(ctx.input.email);

    let leads = (Array.isArray(data) ? data : [data]).filter(Boolean).map((l: any) => ({
      leadId: l._id,
      email: l.email,
      firstName: l.firstName,
      lastName: l.lastName,
      companyName: l.companyName,
      isPaused: l.isPaused,
      state: l.state,
      status: l.status,
      contactId: l.contactId,
      campaignId: l.campaign?.id ?? l.campaignId,
      campaignName: l.campaign?.name ?? l.campaignName,
      campaignStatus: l.campaign?.status,
      updatedAt: l.updatedAt,
      variables: l.variables
    }));

    return {
      output: { leads },
      message: `Found **${leads.length}** lead record(s) for "${ctx.input.email}".`
    };
  })
  .build();
