import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export let listSequences = SlateTool.create(spec, {
  name: 'List Sequences',
  key: 'list_sequences',
  description: `List sequences (automated campaigns) from Outreach. Filter by name, enabled state, owner, or tags. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by sequence name'),
      enabled: z.boolean().optional().describe('Filter by enabled/disabled state'),
      ownerId: z.string().optional().describe('Filter by owner user ID'),
      tag: z.string().optional().describe('Filter by tag'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; keep the same filters and sorting.'),
      sortBy: z.string().optional().describe('Sort field (e.g. "name", "-createdAt")')
    })
  )
  .output(
    z.object({
      sequences: z.array(
        z.object({
          sequenceId: z.string(),
          name: z.string().optional(),
          enabled: z.boolean().optional(),
          sequenceType: z.string().optional(),
          description: z.string().optional(),
          ownerId: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      nextPageOffset: z
        .number()
        .optional()
        .describe('Use as pageOffset for the next page with the same filters.'),
      nextPageAfter: z
        .string()
        .optional()
        .describe('Pass as pageAfter for the next page with unchanged filters.'),
      totalCount: z
        .number()
        .optional()
        .describe('Exact provider count when available and not truncated.')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      name: ctx.input.name,
      enabled: ctx.input.enabled?.toString(),
      'owner/id': ctx.input.ownerId,
      tags: ctx.input.tag
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[limit]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listSequences(params);

    let sequences = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        sequenceId: flat.id,
        name: flat.name,
        enabled: flat.enabled,
        sequenceType: flat.sequenceType,
        description: flat.description,
        ownerId: flat.ownerId,
        updatedAt: flat.updatedAt
      };
    });

    return {
      output: {
        sequences,
        hasMore: result.hasMore,
        nextPageOffset: result.nextPageOffset,
        nextPageAfter: result.nextPageAfter,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${sequences.length}** sequences${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
