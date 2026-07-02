import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prospectSchema = z.object({
  prospectId: z.number().describe('Prospect ID'),
  email: z.string().describe('Prospect email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  website: z.string().optional().describe('Website URL'),
  industry: z.string().optional().describe('Industry'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  country: z.string().optional().describe('Country'),
  status: z
    .string()
    .optional()
    .describe('Global prospect status (ACTIVE, BLACKLIST, REPLIED, BOUNCED, INVALID)'),
  tags: z.string().optional().describe('Prospect tags'),
  lastContacted: z.string().optional().describe('Last contact timestamp'),
  lastReplied: z.string().optional().describe('Last reply timestamp'),
  updated: z.string().optional().describe('Last updated timestamp'),
  campaignDetails: z.array(z.any()).optional().describe('Campaign enrollment details')
});

export let searchProspects = SlateTool.create(spec, {
  name: 'Search Prospects',
  key: 'search_prospects',
  description: `Search and retrieve prospects from the Woodpecker database. Filter by email, name, company, status, campaign, interest level, tags, and custom snippets. Supports pagination and sorting.`,
  instructions: [
    'Use the "search" parameter for field-based search (e.g., "email=john@example.com,company=Acme"). Multiple fields use AND logic; same field type uses OR.',
    'Set "includeCampaignDetails" to true to include per-campaign enrollment information.'
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
        .describe(
          'Comma-separated search criteria using field=value format (e.g., "email=john@example.com,company=Acme")'
        ),
      status: z
        .enum(['ACTIVE', 'BOUNCED', 'REPLIED', 'BLACKLIST', 'INVALID'])
        .optional()
        .describe('Filter by global prospect status'),
      campaignId: z
        .number()
        .optional()
        .describe('Filter prospects enrolled in a specific campaign'),
      interested: z
        .enum(['INTERESTED', 'MAYBE-LATER', 'NOT-INTERESTED', 'NOT-MARKED'])
        .optional()
        .describe('Filter by interest level'),
      contacted: z.boolean().optional().describe('Filter by whether prospect was contacted'),
      includeCampaignDetails: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include campaign enrollment details in results'),
      page: z.number().optional().default(1).describe('Results page number'),
      perPage: z.number().optional().default(100).describe('Results per page (max 1000)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field with direction prefix: +field (asc) or -field (desc)')
    })
  )
  .output(
    z.object({
      prospects: z.array(prospectSchema).describe('List of matching prospects'),
      count: z.number().describe('Number of prospects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let params: Record<string, any> = {};
    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.campaignId) params.campaigns_id = ctx.input.campaignId;
    if (ctx.input.interested) params.interested = ctx.input.interested;
    if (ctx.input.contacted !== undefined) params.contacted = ctx.input.contacted;
    if (ctx.input.includeCampaignDetails) params.campaigns_details = true;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.sort) params.sort = ctx.input.sort;

    let data = await client.searchProspects(params);
    let prospects = Array.isArray(data) ? data : [];

    let mapped = prospects.map((p: any) => ({
      prospectId: p.id,
      email: p.email ?? '',
      firstName: p.first_name,
      lastName: p.last_name,
      company: p.company,
      title: p.title,
      phone: p.phone,
      website: p.website,
      industry: p.industry,
      city: p.city,
      state: p.state,
      country: p.country,
      status: p.status,
      tags: p.tags,
      lastContacted: p.last_contacted,
      lastReplied: p.last_replied,
      updated: p.updated,
      campaignDetails: p.campaigns_details
    }));

    return {
      output: { prospects: mapped, count: mapped.length },
      message: `Found **${mapped.length}** prospect(s) on page ${ctx.input.page ?? 1}.`
    };
  })
  .build();
