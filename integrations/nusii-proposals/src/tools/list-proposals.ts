import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProposals = SlateTool.create(spec, {
  name: 'List Proposals',
  key: 'list_proposals',
  description: `Retrieve a paginated list of proposals with optional filtering by status and archived state. Statuses include: draft, pending, accepted, rejected, and clarification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['draft', 'pending', 'accepted', 'rejected', 'clarification'])
        .optional()
        .describe('Filter proposals by status'),
      archived: z
        .boolean()
        .optional()
        .describe(
          'Filter by archived state (true = archived only, false = non-archived only)'
        ),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of proposals per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      proposals: z.array(
        z.object({
          proposalId: z.string(),
          title: z.string(),
          accountId: z.number(),
          status: z.string(),
          publicId: z.string(),
          preparedById: z.number().nullable(),
          clientId: z.number().nullable(),
          senderId: z.number().nullable(),
          currency: z.string(),
          archivedAt: z.string().nullable(),
          sectionIds: z.array(z.string())
        })
      ),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listProposals({
      status: ctx.input.status,
      archived: ctx.input.archived,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: {
        proposals: result.items,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** proposals${ctx.input.status ? ` with status "${ctx.input.status}"` : ''} (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();
