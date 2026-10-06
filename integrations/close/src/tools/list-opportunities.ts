import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapOpportunity } from '../lib/models';
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
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      opportunities: z.array(
        z.object({
          opportunityId: z.string().describe('Opportunity ID'),
          leadId: z.string().describe('Associated lead ID'),
          statusId: z.string().describe('Status ID'),
          statusLabel: z.string().optional().describe('Human-readable status label'),
          statusType: z.string().optional().describe('Status type (active, won, or lost)'),
          confidence: z.number().describe('Confidence percentage'),
          value: z.number().optional().describe('Monetary value in cents'),
          valuePeriod: z.string().describe('Value period (one_time, monthly, or annual)'),
          dateCreated: z.string().describe('Creation timestamp'),
          dateUpdated: z.string().describe('Last update timestamp')
        })
      ),
      totalResults: z.number().optional().describe('Total number of matching opportunities'),
      hasMore: z
        .boolean()
        .describe('Whether more results are available beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listOpportunities(ctx.input);
    const opportunities = result.data.map(mapOpportunity);
    return {
      output: {
        opportunities,
        totalResults: result.total_results ?? undefined,
        hasMore: result.has_more,
        nextSkip: result.has_more ? (ctx.input.skip ?? 0) + opportunities.length : undefined
      },
      message: `Returned ${opportunities.length} opportunity record(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
