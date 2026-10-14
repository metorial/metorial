import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeTickets = SlateTool.create(spec, {
  name: 'Merge Tickets',
  key: 'merge_tickets',
  description: `Merge or unmerge HelpDesk tickets. In "merge" mode, multiple child tickets are merged into a single parent ticket, consolidating their conversations. In "unmerge" mode, a previously merged ticket is separated back into individual tickets.`,
  instructions: [
    'Set mode to "merge" and provide both parentTicketId and childTicketIds to merge tickets together.',
    'Set mode to "unmerge" and provide only the ticketId to reverse a previous merge.',
    'When merging, the parent ticket retains its properties and the child tickets are folded into it.',
    'When unmerging, the ticket specified by ticketId is separated from its parent.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z.enum(['merge', 'unmerge']).describe('Whether to merge or unmerge tickets'),
      parentTicketId: z.string().optional().describe('Required for merge: parent ticket ID'),
      childTicketIds: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Required for merge: child ticket IDs to merge into the parent'),
      ticketId: z
        .string()
        .optional()
        .describe('Required for unmerge: child ticket ID to separate from its parent')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the merge/unmerge operation completed successfully'),
      mode: z.enum(['merge', 'unmerge']).describe('The operation that was performed'),
      ticketId: z.string().describe('The primary ticket ID involved in the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'merge') {
      if (!ctx.input.parentTicketId || !ctx.input.childTicketIds?.length) {
        throw createApiServiceError(
          'parentTicketId and at least one childTicketIds value are required for merge.'
        );
      }
      if (ctx.input.ticketId !== undefined) {
        throw createApiServiceError(
          'Use parentTicketId and childTicketIds for merge; ticketId is only used for unmerge.'
        );
      }
      if (ctx.input.childTicketIds.includes(ctx.input.parentTicketId)) {
        throw createApiServiceError('A parent ticket cannot be merged into itself.');
      }
      await client.mergeTickets(ctx.input.parentTicketId, ctx.input.childTicketIds);

      return {
        output: {
          success: true,
          mode: 'merge' as const,
          ticketId: ctx.input.parentTicketId
        },
        message: `Successfully merged **${ctx.input.childTicketIds.length}** ticket(s) into parent ticket **${ctx.input.parentTicketId}**.`
      };
    }

    if (!ctx.input.ticketId) {
      throw createApiServiceError('ticketId is required for unmerge.');
    }
    if (ctx.input.parentTicketId !== undefined || ctx.input.childTicketIds !== undefined) {
      throw createApiServiceError(
        'Use ticketId for unmerge; parentTicketId and childTicketIds are only used for merge.'
      );
    }
    await client.unmergeTicket(ctx.input.ticketId);

    return {
      output: {
        success: true,
        mode: 'unmerge' as const,
        ticketId: ctx.input.ticketId
      },
      message: `Successfully unmerged ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
