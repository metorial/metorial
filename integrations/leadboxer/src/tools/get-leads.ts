import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.string().optional().describe('LeadBoxer user ID'),
  email: z.string().optional().describe('Lead email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  companyName: z.string().optional().describe('Identified company name'),
  companyDomain: z.string().optional().describe('Company domain'),
  industry: z.string().optional().describe('Company industry'),
  employeeCountRange: z.string().optional().describe('Employee count range'),
  country: z.string().optional().describe('Country'),
  city: z.string().optional().describe('City'),
  engagementScore: z.number().optional().describe('Engagement score (0-100)'),
  totalVisits: z.number().optional().describe('Total number of visits'),
  totalPagesViewed: z.number().optional().describe('Total pages viewed'),
  lastEventTime: z.string().optional().describe('Timestamp of last event'),
  firstSessionTime: z.string().optional().describe('Timestamp of first session'),
  lastChannel: z.string().optional().describe('Last traffic channel'),
  entryUrl: z.string().optional().describe('Entry URL')
});

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve a list of identified leads/visitors from your LeadBoxer dataset. Supports filtering by search query, time period, email, and sorting. Returns lead contact info, company data, engagement scores, and visit metrics.`,
  instructions: [
    'Use the `period` parameter with values like "1d" (1 day), "7d" (7 days), "30d" (30 days), "1y" (1 year) to filter by time.',
    'Use `sortBy` with format "field|direction", e.g. "lastEvent|desc" to sort by most recent activity.',
    'Set `limit` to control the number of results returned (default varies by API).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter leads. Use "*" for all leads.'),
      limit: z.number().optional().describe('Maximum number of leads to return'),
      period: z
        .string()
        .optional()
        .describe('Time period filter, e.g. "1d", "7d", "30d", "1y"'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field and direction, e.g. "lastEvent|desc"'),
      email: z.string().optional().describe('Filter by specific email address')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of matching leads'),
      count: z.number().describe('Number of leads returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let rawLeads = await client.getLeads({
      search: ctx.input.search,
      limit: ctx.input.limit,
      period: ctx.input.period,
      sortBy: ctx.input.sortBy,
      email: ctx.input.email
    });

    let leadsArray = Array.isArray(rawLeads) ? rawLeads : [];

    let leads = leadsArray.map((lead: any) => ({
      leadId: lead.use_id || lead.leadId,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      companyName: lead.organizationName || lead.last_most_likely_company,
      companyDomain: lead.organizationDomain,
      industry: lead.organizationIndustryName,
      employeeCountRange: lead.organizationEmployeeCountRangeName,
      country: lead.last_country_name,
      city: lead.last_city,
      engagementScore: lead.esScore != null ? Number(lead.esScore) : undefined,
      totalVisits:
        lead.total_number_visits != null ? Number(lead.total_number_visits) : undefined,
      totalPagesViewed:
        lead.total_pages_viewed != null ? Number(lead.total_pages_viewed) : undefined,
      lastEventTime: lead.lastEvent || lead.prettyLastEvent,
      firstSessionTime: lead.first_session_unix_timestamp
        ? String(lead.first_session_unix_timestamp)
        : undefined,
      lastChannel: lead.last_channel,
      entryUrl: lead.entry_root_url
    }));

    return {
      output: {
        leads,
        count: leads.length
      },
      message: `Retrieved **${leads.length}** lead(s) from LeadBoxer.`
    };
  })
  .build();
