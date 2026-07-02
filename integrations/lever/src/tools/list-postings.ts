import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPostingsTool = SlateTool.create(spec, {
  name: 'List Postings',
  key: 'list_postings',
  description: `List job postings in Lever with optional filtering by state, team, department, location, and commitment. Returns posting details including job descriptions, categories, and distribution channels.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      state: z
        .enum(['published', 'internal', 'closed', 'draft', 'pending', 'rejected'])
        .optional()
        .describe('Filter by posting state'),
      team: z.string().optional().describe('Filter by team name'),
      department: z.string().optional().describe('Filter by department name'),
      location: z.string().optional().describe('Filter by location name'),
      commitment: z.string().optional().describe('Filter by commitment (e.g., Full-time)'),
      limit: z.number().optional().describe('Max results to return'),
      offset: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      postings: z.array(z.any()).describe('List of job posting objects'),
      hasNext: z.boolean().describe('Whether more results are available'),
      next: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let params: Record<string, any> = {};
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.team) params.team = ctx.input.team;
    if (ctx.input.department) params.department = ctx.input.department;
    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.commitment) params.commitment = ctx.input.commitment;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listPostings(params);

    return {
      output: {
        postings: result.data || [],
        hasNext: result.hasNext || false,
        next: result.next || undefined
      },
      message: `Found ${(result.data || []).length} job postings.${result.hasNext ? ' More results available.' : ''}`
    };
  })
  .build();
