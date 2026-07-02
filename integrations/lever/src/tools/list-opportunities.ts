import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOpportunitiesTool = SlateTool.create(spec, {
  name: 'List Opportunities',
  key: 'list_opportunities',
  description: `List and search opportunities (candidacies) in Lever. Supports filtering by tags, email, origin, posting, stage, archive status, and date ranges. Returns paginated results with candidate contact information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactEmail: z.string().optional().describe('Filter by candidate email address'),
      tag: z.array(z.string()).optional().describe('Filter by tags'),
      origin: z
        .enum(['applied', 'sourced', 'referred', 'university', 'agency', 'internal'])
        .optional()
        .describe('Filter by opportunity origin'),
      postingId: z.string().optional().describe('Filter by posting ID'),
      stageId: z.string().optional().describe('Filter by pipeline stage ID'),
      archiveStatus: z
        .enum(['archived', 'active'])
        .optional()
        .describe('Filter by archive status. Defaults to active.'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Filter by creation date start (ISO 8601 timestamp)'),
      createdAtEnd: z
        .string()
        .optional()
        .describe('Filter by creation date end (ISO 8601 timestamp)'),
      updatedAtStart: z
        .string()
        .optional()
        .describe('Filter by update date start (ISO 8601 timestamp)'),
      updatedAtEnd: z
        .string()
        .optional()
        .describe('Filter by update date end (ISO 8601 timestamp)'),
      limit: z.number().optional().describe('Max results to return (default 100, max 100)'),
      offset: z.string().optional().describe('Pagination cursor from previous response'),
      expand: z
        .array(z.enum(['applications', 'stage', 'owner', 'followers', 'sourcedBy', 'contact']))
        .optional()
        .describe('Related objects to include in the response')
    })
  )
  .output(
    z.object({
      opportunities: z.array(z.any()).describe('List of opportunity objects'),
      hasNext: z.boolean().describe('Whether more results are available'),
      next: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let params: Record<string, any> = {};
    if (ctx.input.contactEmail) params.email = ctx.input.contactEmail;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.origin) params.origin = ctx.input.origin;
    if (ctx.input.postingId) params.posting_id = ctx.input.postingId;
    if (ctx.input.stageId) params.stage_id = ctx.input.stageId;
    if (ctx.input.archiveStatus === 'archived') params.archived = true;
    if (ctx.input.archiveStatus === 'active') params.archived = false;
    if (ctx.input.createdAtStart)
      params.created_at_start = new Date(ctx.input.createdAtStart).getTime();
    if (ctx.input.createdAtEnd)
      params.created_at_end = new Date(ctx.input.createdAtEnd).getTime();
    if (ctx.input.updatedAtStart)
      params.updated_at_start = new Date(ctx.input.updatedAtStart).getTime();
    if (ctx.input.updatedAtEnd)
      params.updated_at_end = new Date(ctx.input.updatedAtEnd).getTime();
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;
    if (ctx.input.expand) params.expand = ctx.input.expand;

    let result = await client.listOpportunities(params);

    return {
      output: {
        opportunities: result.data || [],
        hasNext: result.hasNext || false,
        next: result.next || undefined
      },
      message: `Found ${(result.data || []).length} opportunities.${result.hasNext ? ' More results available.' : ''}`
    };
  })
  .build();
