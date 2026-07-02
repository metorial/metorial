import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let newLeads = SlateTrigger.create(spec, {
  name: 'New Leads',
  key: 'new_leads',
  description:
    'Triggers when new company leads are identified visiting your website. Polls for leads with a first visit date after the last known lead.'
})
  .input(
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
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier for the lead'),
      name: z.string().describe('Company name'),
      industry: z.string().describe('Primary industry'),
      industries: z.array(z.string()).describe('All associated industries'),
      firstVisitDate: z.string().describe('Date of the first visit'),
      lastVisitDate: z.string().describe('Date of the most recent visit'),
      status: z.string(),
      websiteUrl: z.string().describe('Company website URL'),
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
      visits: z.number().describe('Total number of visits'),
      quality: z.number().describe('Lead quality score (0-10)'),
      viewInLeadfeeder: z.string().describe('Direct link to view this lead in Leadfeeder'),
      country: z.string(),
      countryCode: z.string(),
      region: z.string(),
      city: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LeadfeederClient(ctx.auth.token);

      let accountId = ctx.config.accountId;
      if (!accountId) {
        let accounts = await client.getAccounts();
        if (accounts.length === 0) return { inputs: [], updatedState: ctx.state };
        accountId = accounts[0]!.accountId;
      }

      let now = new Date();
      let endDate = now.toISOString().split('T')[0]!;

      // Look back 7 days on first poll, or use the last known date
      let lastKnownDate = ctx.state?.lastSeenDate as string | undefined;
      let startDate =
        lastKnownDate ??
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      let seenIds = (ctx.state?.seenLeadIds as string[] | undefined) ?? [];

      let result = await client.getLeads(accountId, {
        startDate,
        endDate,
        pageSize: 100
      });

      let newLeads = result.items.filter(lead => !seenIds.includes(lead.leadId));

      let updatedSeenIds = result.items.map(l => l.leadId);

      return {
        inputs: newLeads,
        updatedState: {
          lastSeenDate: endDate,
          seenLeadIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let lead = ctx.input;

      return {
        type: 'lead.identified',
        id: `lead-${lead.leadId}-${lead.lastVisitDate}`,
        output: {
          leadId: lead.leadId,
          name: lead.name,
          industry: lead.industry,
          industries: lead.industries,
          firstVisitDate: lead.firstVisitDate,
          lastVisitDate: lead.lastVisitDate,
          status: lead.status,
          websiteUrl: lead.websiteUrl,
          phone: lead.phone,
          linkedinUrl: lead.linkedinUrl,
          twitterHandle: lead.twitterHandle,
          facebookUrl: lead.facebookUrl,
          employeeCount: lead.employeeCount,
          employeesRange: lead.employeesRange,
          crmLeadId: lead.crmLeadId,
          crmOrganizationId: lead.crmOrganizationId,
          tags: lead.tags,
          logoUrl: lead.logoUrl,
          assignee: lead.assignee,
          businessId: lead.businessId,
          revenue: lead.revenue,
          visits: lead.visits,
          quality: lead.quality,
          viewInLeadfeeder: lead.viewInLeadfeeder,
          country: lead.location?.country ?? '',
          countryCode: lead.location?.countryCode ?? '',
          region: lead.location?.region ?? '',
          city: lead.location?.city ?? ''
        }
      };
    }
  })
  .build();
