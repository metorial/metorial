import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadsTool = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Lists and searches leads in Close CRM with optional text query filtering and pagination. Returns a summary of each lead.`,
  instructions: [
    'Use the query parameter for free-text search across lead names, contacts, emails, phones, and other fields.',
    'Use skip for offset-based pagination. Combine with limit to page through results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Text search query to filter leads (searches across names, emails, phones, etc.)'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of leads to return (default: 100)'),
      skip: z.number().optional().describe('Number of leads to skip for pagination')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.string().describe('Unique lead ID'),
          name: z.string().describe('Lead/company name'),
          statusId: z.string().nullable().describe('Lead status ID'),
          statusLabel: z.string().nullable().describe('Lead status label'),
          displayName: z.string().describe('Lead display name'),
          dateCreated: z.string().describe('Creation timestamp'),
          dateUpdated: z.string().describe('Last updated timestamp')
        })
      ),
      totalResults: z.number().describe('Total number of leads matching the query'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let limit = ctx.input.limit ?? 100;

    let result = await client.listLeads({
      query: ctx.input.query,
      limit,
      skip: ctx.input.skip
    });

    let leads = (result.data || []).map((lead: any) => ({
      leadId: lead.id,
      name: lead.name || lead.display_name || '',
      statusId: lead.status_id || null,
      statusLabel: lead.status_label || null,
      displayName: lead.display_name || lead.name || '',
      dateCreated: lead.date_created || '',
      dateUpdated: lead.date_updated || ''
    }));

    let totalResults = result.total_results ?? leads.length;
    let skip = ctx.input.skip ?? 0;
    let hasMore = skip + leads.length < totalResults;

    return {
      output: {
        leads,
        totalResults,
        hasMore
      },
      message: `Found **${totalResults}** lead${totalResults !== 1 ? 's' : ''}${ctx.input.query ? ` matching "${ctx.input.query}"` : ''} (showing ${leads.length}${hasMore ? ', more available' : ''})`
    };
  })
  .build();
