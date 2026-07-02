import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.string().optional().describe('Unique identifier for the lead'),
  email: z.string().optional().describe('Email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  companyName: z.string().optional().describe('Company name'),
  companyUrl: z.string().optional().describe('Company website URL'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  linkedin: z.string().optional().describe('LinkedIn profile URL'),
  twitter: z.string().optional().describe('Twitter handle')
});

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search and list leads in your GetProspect account. Supports filtering, sorting, searching by keyword, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search keyword to filter leads'),
      companyId: z.string().optional().describe('Filter leads by company ID'),
      filter: z.string().optional().describe('Additional filter criteria'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of leads matching the search criteria'),
      totalCount: z.number().optional().describe('Total number of matching leads'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeads({
      search: ctx.input.search,
      companyId: ctx.input.companyId,
      filter: ctx.input.filter,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let leads = result.data ?? result.leads ?? result ?? [];
    let leadsArray = Array.isArray(leads) ? leads : [];

    return {
      output: {
        leads: leadsArray.map((lead: any) => ({
          leadId: lead.id ?? lead.lead_id,
          email: lead.email,
          firstName: lead.first_name,
          lastName: lead.last_name,
          companyName: lead.company_name,
          companyUrl: lead.company_url,
          title: lead.title,
          phone: lead.phone,
          linkedin: lead.linkedin,
          twitter: lead.twitter
        })),
        totalCount: result.total ?? result.totalCount,
        page: result.page
      },
      message: `Found **${leadsArray.length}** lead(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
