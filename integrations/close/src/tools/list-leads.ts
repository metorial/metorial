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
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      leads: z.array(
        z.object({
          leadId: z.string().describe('Unique lead ID'),
          name: z.string().optional().describe('Lead/company name, when set'),
          statusId: z.string().nullable().describe('Lead status ID'),
          statusLabel: z.string().nullable().describe('Lead status label'),
          displayName: z.string().optional().describe('Lead display name, when provided'),
          dateCreated: z.string().describe('Creation timestamp'),
          dateUpdated: z.string().describe('Last updated timestamp')
        })
      ),
      totalResults: z.number().optional().describe('Total number of leads matching the query'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listLeads(ctx.input);
    const leads = result.data.map(l => ({
      leadId: l.id,
      name: l.name ?? undefined,
      statusId: l.status_id,
      statusLabel: l.status_label ?? null,
      displayName: l.display_name,
      dateCreated: l.date_created,
      dateUpdated: l.date_updated
    }));
    return {
      output: {
        leads,
        totalResults: result.total_results ?? undefined,
        hasMore: result.has_more,
        nextSkip: result.has_more ? (ctx.input.skip ?? 0) + leads.length : undefined
      },
      message: `Returned ${leads.length} lead(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
