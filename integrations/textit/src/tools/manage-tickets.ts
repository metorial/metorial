import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTickets = SlateTool.create(spec, {
  name: 'Manage Tickets',
  key: 'manage_tickets',
  description: `Perform bulk actions on support tickets: assign to a user, add a note, close, or reopen tickets.`,
  instructions: [
    'Provide assigneeEmail when using the "assign" action.',
    'Provide noteText when using the "note" action.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ticketUuids: z.array(z.string()).describe('List of ticket UUIDs to act on'),
      action: z.enum(['assign', 'note', 'close', 'reopen']).describe('Action to perform'),
      assigneeEmail: z
        .string()
        .optional()
        .describe('Email of the user to assign (for "assign" action)'),
      noteText: z.string().optional().describe('Note text to add (for "note" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.performTicketAction({
      tickets: ctx.input.ticketUuids,
      action: ctx.input.action,
      assignee: ctx.input.assigneeEmail,
      note: ctx.input.noteText
    });

    return {
      output: { success: true },
      message: `Successfully performed **${ctx.input.action}** on **${ctx.input.ticketUuids.length}** ticket(s).`
    };
  })
  .build();
