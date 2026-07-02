import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOpportunities = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `List opportunities in Close CRM with optional filtering by lead, user, status, and search query.
Returns a paginated list of opportunities along with total results and whether more results are available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('Filter opportunities by lead ID'),
      userId: z.string().optional().describe('Filter opportunities by user (owner) ID'),
      statusId: z.string().optional().describe('Filter opportunities by status ID'),
      statusType: z
        .enum(['active', 'won', 'lost'])
        .optional()
        .describe('Filter opportunities by status type'),
      query: z.string().optional().describe('Search query to filter opportunities'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 100)'),
      skip: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      opportunities: z.array(
        z.object({
          opportunityId: z.string().describe('Opportunity ID'),
          leadId: z.string().describe('Associated lead ID'),
          statusId: z.string().describe('Status ID'),
          statusLabel: z.string().describe('Human-readable status label'),
          statusType: z.string().describe('Status type (active, won, or lost)'),
          confidence: z.number().describe('Confidence percentage'),
          value: z.number().describe('Monetary value in cents'),
          valuePeriod: z.string().describe('Value period (one_time, monthly, or annual)'),
          dateCreated: z.string().describe('Creation timestamp'),
          dateUpdated: z.string().describe('Last update timestamp')
        })
      ),
      totalResults: z.number().describe('Total number of matching opportunities'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let response = await client.listOpportunities({
      leadId: ctx.input.leadId,
      userId: ctx.input.userId,
      statusId: ctx.input.statusId,
      statusType: ctx.input.statusType,
      query: ctx.input.query,
      limit: ctx.input.limit ?? 100,
      skip: ctx.input.skip
    });

    let opportunities = (response.data ?? []).map((o: any) => ({
      opportunityId: o.id,
      leadId: o.lead_id,
      statusId: o.status_id,
      statusLabel: o.status_label ?? '',
      statusType: o.status_type ?? '',
      confidence: o.confidence ?? 0,
      value: o.value ?? 0,
      valuePeriod: o.value_period ?? 'one_time',
      dateCreated: o.date_created,
      dateUpdated: o.date_updated
    }));

    let totalResults = response.total_results ?? opportunities.length;
    let hasMore = (ctx.input.skip ?? 0) + opportunities.length < totalResults;

    return {
      output: {
        opportunities,
        totalResults,
        hasMore
      },
      message: `Found **${totalResults}** opportunities${ctx.input.leadId ? ` for lead **${ctx.input.leadId}**` : ''}${ctx.input.statusType ? ` (status: ${ctx.input.statusType})` : ''} — returning ${opportunities.length} results.`
    };
  })
  .build();
