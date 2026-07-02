import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getLeadDetails = SlateTool.create(spec, {
  name: 'Get Lead Details',
  key: 'get_lead_details',
  description: `Retrieve detailed information about a specific lead (company) by ID. Returns full company profile including name, industry, location, social profiles, employee count, quality score, and total visit count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Leadfeeder account ID. Falls back to config or first available account.'),
      leadId: z.string().describe('The lead ID to retrieve details for')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      name: z.string(),
      industry: z.string(),
      industries: z.array(z.string()),
      firstVisitDate: z.string(),
      lastVisitDate: z.string(),
      status: z.string(),
      websiteUrl: z.string(),
      phone: z.string(),
      linkedinUrl: z.string(),
      twitterHandle: z.string(),
      facebookUrl: z.string(),
      employeeCount: z.number(),
      employeesRange: z.object({ min: z.number(), max: z.number() }).nullable(),
      crmLeadId: z.string(),
      crmOrganizationId: z.string(),
      tags: z.array(z.string()),
      logoUrl: z.string(),
      assignee: z.string(),
      businessId: z.string(),
      revenue: z.string(),
      visits: z.number(),
      quality: z.number(),
      viewInLeadfeeder: z.string(),
      location: z
        .object({
          country: z.string(),
          countryCode: z.string(),
          region: z.string(),
          regionCode: z.string(),
          city: z.string(),
          stateCode: z.string()
        })
        .nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);

    let accountId = ctx.input.accountId ?? ctx.config.accountId;
    if (!accountId) {
      let accounts = await client.getAccounts();
      if (accounts.length === 0) throw new Error('No Leadfeeder accounts found');
      accountId = accounts[0]!.accountId;
    }

    let lead = await client.getLead(accountId, ctx.input.leadId);

    return {
      output: lead,
      message: `Retrieved lead details for **${lead.name}** (quality: ${lead.quality}/10, ${lead.visits} total visits).`
    };
  })
  .build();
