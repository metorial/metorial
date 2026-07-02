import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Retrieve support tickets from your TextIt workspace. Filter by ticket UUID or contact UUID. Returns tickets with their status, topic, and assignee.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketUuid: z.string().optional().describe('Filter by a specific ticket UUID'),
      contactUuid: z.string().optional().describe('Filter by contact UUID')
    })
  )
  .output(
    z.object({
      tickets: z.array(
        z.object({
          ticketUuid: z.string(),
          contactUuid: z.string(),
          contactName: z.string().nullable(),
          status: z.enum(['open', 'closed']),
          topic: z.object({ topicUuid: z.string(), name: z.string() }).nullable(),
          assignee: z.object({ email: z.string(), name: z.string() }).nullable(),
          openedOn: z.string(),
          modifiedOn: z.string(),
          closedOn: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listTickets({
      uuid: ctx.input.ticketUuid,
      contact: ctx.input.contactUuid
    });

    let tickets = result.results.map(t => ({
      ticketUuid: t.uuid,
      contactUuid: t.contact.uuid,
      contactName: t.contact.name,
      status: t.status,
      topic: t.topic ? { topicUuid: t.topic.uuid, name: t.topic.name } : null,
      assignee: t.assignee,
      openedOn: t.opened_on,
      modifiedOn: t.modified_on,
      closedOn: t.closed_on
    }));

    return {
      output: {
        tickets,
        hasMore: result.next !== null
      },
      message: `Found **${tickets.length}** ticket(s).`
    };
  })
  .build();
