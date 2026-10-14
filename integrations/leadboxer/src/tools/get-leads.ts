import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadNumber, leadString } from '../lib/responses';
import { datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
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
    'Call list_datasets to discover the dataset ID. Existing connections can use their saved dataset.',
    'The default limit is 50 and the default period is 30d. Periods use fixed day counts (1y is 365 days). Use criteriaTimeFilter for calendar date ranges.',
    'Use nextToken from the response to fetch the next page within 10 minutes.'
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
      email: z.string().optional().describe('Filter by specific lead email address'),
      datasetId: datasetIdSchema,
      nextToken: z
        .string()
        .optional()
        .describe(
          'Pagination token returned by a previous get_leads call. Valid for 10 minutes.'
        ),
      criteriaTimeFilter: z
        .string()
        .optional()
        .describe(
          'Provider time filter, such as eventEsTimestamp|lessthan|6 or eventEsTimestamp|between|04/11/2025-10/12/2025. Overrides period.'
        ),
      criteriaTextFilter: z
        .string()
        .optional()
        .describe(
          'Comma-separated text filters in field|operator|value format, such as organizationIndustryName.raw|contains|Software.'
        ),
      criteriaNumberFilter: z
        .string()
        .optional()
        .describe(
          'Comma-separated numeric filters, such as user.total_number_visits|greaterthan|12.'
        ),
      timeField: z
        .enum(['eventEsTimestamp', 'first_session_unix_timestamp'])
        .optional()
        .describe('Time field to filter: last seen or first seen. Defaults to last seen.')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of matching leads'),
      count: z.number().describe('Number of leads returned'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Token to retrieve the next page, when more results exist. Valid for 10 minutes.'
        ),
      totalCount: z.number().optional().describe('Total matching rows reported by LeadBoxer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config)
    });

    let rawLeads = await client.getLeads({
      search: ctx.input.search,
      limit: ctx.input.limit,
      period: ctx.input.period,
      sortBy: ctx.input.sortBy,
      email: ctx.input.email,
      nextToken: ctx.input.nextToken,
      criteriaTimeFilter: ctx.input.criteriaTimeFilter,
      criteriaTextFilter: ctx.input.criteriaTextFilter,
      criteriaNumberFilter: ctx.input.criteriaNumberFilter,
      timeField: ctx.input.timeField
    });

    let leads = rawLeads.data.map(lead => ({
      leadId: leadString(lead.use_id ?? lead.leadId),
      email: leadString(lead.email),
      firstName: leadString(lead.firstName),
      lastName: leadString(lead.lastName),
      companyName: leadString(lead.organizationName || lead.last_most_likely_company),
      companyDomain: leadString(lead.organizationDomain),
      industry: leadString(lead.organizationIndustryName),
      employeeCountRange: leadString(lead.organizationEmployeeCountRangeName),
      country: leadString(lead.last_country_name),
      city: leadString(lead.last_city),
      engagementScore: leadNumber(lead.esScore),
      totalVisits: leadNumber(lead.total_number_visits),
      totalPagesViewed: leadNumber(lead.total_pages_viewed),
      lastEventTime: leadString(lead.lastEvent || lead.prettyLastEvent),
      firstSessionTime: leadString(lead.first_session_unix_timestamp),
      lastChannel: leadString(lead.last_channel),
      entryUrl: leadString(lead.entry_root_url)
    }));

    return {
      output: {
        leads,
        count: leads.length,
        nextToken: leadString(rawLeads.metaData.nextToken),
        totalCount: leadNumber(rawLeads.metaData.totalRows)
      },
      message: `Retrieved **${leads.length}** lead(s) from LeadBoxer.`
    };
  })
  .build();
