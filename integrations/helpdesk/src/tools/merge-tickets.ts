import { SlateTool } from 'slates';
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
    z.discriminatedUnion('mode', [
      z.object({
        mode: z.literal('merge').describe('Merge child tickets into a parent ticket'),
        parentTicketId: z
          .string()
          .describe('The ID of the parent ticket that child tickets will be merged into'),
        childTicketIds: z
          .array(z.string())
          .min(1)
          .describe(
            'Array of ticket IDs to merge into the parent ticket (at least one required)'
          )
      }),
      z.object({
        mode: z.literal('unmerge').describe('Unmerge a previously merged ticket'),
        ticketId: z.string().describe('The ID of the ticket to unmerge from its parent')
      })
    ])
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
