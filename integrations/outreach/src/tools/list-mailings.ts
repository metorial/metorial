import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export let listMailings = SlateTool.create(spec, {
  name: 'List Mailings',
  key: 'list_mailings',
  description: `List emails (mailings, including drafted or scheduled messages) from Outreach. Filter by prospect or sequence.
Mailings include delivery tracking data such as bounced, delivered, opened, and replied status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prospectId: z.string().optional().describe('Filter by prospect ID'),
      sequenceId: z.string().optional().describe('Filter by sequence ID'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; keep the same filters and sorting.'),
      sortBy: z.string().optional().describe('Sort field (e.g. "-createdAt")')
    })
  )
  .output(
    z.object({
      mailings: z.array(
        z.object({
          mailingId: z.string(),
          subject: z.string().optional(),
          state: z.string().optional(),
          prospectId: z.string().optional(),
          sequenceId: z.string().optional(),
          bouncedAt: z.string().optional(),
          deliveredAt: z.string().optional(),
          openedAt: z.string().optional(),
          repliedAt: z.string().optional(),
          createdAt: z.string().optional(),
          openCount: z.number().optional(),
          clickCount: z.number().optional()
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
      'prospect/id': ctx.input.prospectId,
      'sequence/id': ctx.input.sequenceId
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[limit]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listMailings(params);

    let mailings = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        mailingId: flat.id,
        subject: flat.subject,
        state: flat.state,
        prospectId: flat.prospectId,
        sequenceId: flat.sequenceId,
        bouncedAt: flat.bouncedAt,
        deliveredAt: flat.deliveredAt,
        openedAt: flat.openedAt,
        repliedAt: flat.repliedAt,
        createdAt: flat.createdAt,
        openCount: flat.openCount,
        clickCount: flat.clickCount
      };
    });

    return {
      output: {
        mailings,
        hasMore: result.hasMore,
        nextPageOffset: result.nextPageOffset,
        nextPageAfter: result.nextPageAfter,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${mailings.length}** mailings${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
