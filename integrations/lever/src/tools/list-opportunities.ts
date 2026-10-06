import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, page, pagination, stringList, text, timestamp } from '../lib/contracts';
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
        .describe(
          'Filter by archive status. Omit to include archived and active opportunities.'
        ),
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
    const params = pagination(ctx.input);
    if (ctx.input.contactEmail !== undefined)
      params.email = text(ctx.input.contactEmail, 'Contact email');
    if (ctx.input.tag !== undefined) params.tag = stringList(ctx.input.tag, 'Tags');
    if (ctx.input.origin !== undefined) params.origin = ctx.input.origin;
    if (ctx.input.postingId !== undefined) params.posting_id = id(ctx.input.postingId);
    if (ctx.input.stageId !== undefined) params.stage_id = id(ctx.input.stageId);
    if (ctx.input.archiveStatus !== undefined)
      params.archived = ctx.input.archiveStatus === 'archived';
    for (const [field, parameter] of [
      ['createdAtStart', 'created_at_start'],
      ['createdAtEnd', 'created_at_end'],
      ['updatedAtStart', 'updated_at_start'],
      ['updatedAtEnd', 'updated_at_end']
    ] as const)
      if (ctx.input[field] !== undefined)
        params[parameter] = timestamp(ctx.input[field], field);
    for (const prefix of ['created_at', 'updated_at'])
      if (
        typeof params[`${prefix}_start`] === 'number' &&
        typeof params[`${prefix}_end`] === 'number' &&
        (params[`${prefix}_start`] as number) > (params[`${prefix}_end`] as number)
      )
        invalid('Date range end must be on or after its start.');
    if (ctx.input.expand !== undefined) params.expand = ctx.input.expand.join(',');
    const result = page(await new Client(ctx.auth).listOpportunities(params));
    return {
      output: { opportunities: result.data, hasNext: result.hasNext, next: result.next },
      message: `Retrieved ${result.data.length} opportunities${result.hasNext ? '; more pages available' : ''}.`
    };
  })
  .build();
