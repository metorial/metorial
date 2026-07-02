import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFilterParams, flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let listMailings = SlateTool.create(spec, {
  name: 'List Mailings',
  key: 'list_mailings',
  description: `List sent emails (mailings) from Outreach. Filter by prospect, sequence, or tracking status.
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
      pageOffset: z.number().optional().describe('Page offset for pagination'),
      sortBy: z.string().optional().describe('Sort field (e.g. "-createdAt")')
    })
  )
  .output(
    z.object({
      mailings: z.array(
        z.object({
          mailingId: z.string(),
          subject: z.string().optional(),
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
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let filterParams = buildFilterParams({
      'prospect/id': ctx.input.prospectId,
      'sequence/id': ctx.input.sequenceId
    });

    let params: Record<string, string> = { ...filterParams };
    if (ctx.input.pageSize) params['page[size]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;

    let result = await client.listMailings(params);

    let mailings = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        mailingId: flat.id,
        subject: flat.subject,
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
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${mailings.length}** mailings${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
