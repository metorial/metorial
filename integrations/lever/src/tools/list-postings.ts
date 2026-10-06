import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { page, pagination, text } from '../lib/contracts';
import { spec } from '../spec';

export let listPostingsTool = SlateTool.create(spec, {
  name: 'List Postings',
  key: 'list_postings',
  description: `List job postings in Lever with optional filtering by state, team, department, location, and commitment. Returns posting details including job descriptions, categories, and distribution channels.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      distributionChannels: z
        .array(z.enum(['public', 'internal']))
        .optional()
        .describe('Published posting audiences; use both to include every published posting'),
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
    const params = pagination(ctx.input);
    for (const key of ['state', 'team', 'department', 'location', 'commitment'] as const)
      if (ctx.input[key] !== undefined) params[key] = text(ctx.input[key], key);
    if (ctx.input.distributionChannels !== undefined)
      params.distributionChannel = ctx.input.distributionChannels.join(',');
    const result = page(await new Client(ctx.auth).listPostings(params));
    return {
      output: { postings: result.data, hasNext: result.hasNext, next: result.next },
      message: `Retrieved ${result.data.length} postings${result.hasNext ? '; more pages available' : ''}.`
    };
  })
  .build();
