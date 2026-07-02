import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTicketStatus = SlateTool.create(spec, {
  name: 'Update Ticket Status',
  key: 'update_ticket_status',
  description: `Change the status of a ticket. Supports archiving/unarchiving, trashing/untrashing, marking as spam/not spam, marking as answered/unanswered, starring/unstarring, and permanently deleting trashed tickets (admin only).`,
  instructions: [
    'Only one action can be performed per invocation. Choose the appropriate action for the desired state change.',
    'Permanently deleting a ticket requires admin privileges and the ticket must already be in the trash.'
  ]
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to update'),
      action: z
        .enum([
          'archive',
          'unarchive',
          'trash',
          'untrash',
          'spam',
          'unspam',
          'answered',
          'unanswered',
          'star',
          'unstar',
          'delete'
        ])
        .describe('The status action to perform on the ticket')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('The ID of the updated ticket'),
      action: z.string().describe('The action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let { ticketId, action } = ctx.input;

    switch (action) {
      case 'archive':
        await client.archiveTicket(ticketId);
        break;
      case 'unarchive':
        await client.unarchiveTicket(ticketId);
        break;
      case 'trash':
        await client.trashTicket(ticketId);
        break;
      case 'untrash':
        await client.untrashTicket(ticketId);
        break;
      case 'spam':
        await client.markSpam(ticketId);
        break;
      case 'unspam':
        await client.unmarkSpam(ticketId);
        break;
      case 'answered':
        await client.markAnswered(ticketId);
        break;
      case 'unanswered':
        await client.markUnanswered(ticketId);
        break;
      case 'star':
        await client.starTicket(ticketId);
        break;
      case 'unstar':
        await client.unstarTicket(ticketId);
        break;
      case 'delete':
        await client.deleteTicket(ticketId);
        break;
    }

    return {
      output: { ticketId, action, success: true },
      message: `Ticket **#${ticketId}** successfully updated: **${action}**`
    };
  })
  .build();
