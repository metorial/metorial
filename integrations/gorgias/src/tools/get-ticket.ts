import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve full details of a single support ticket, including messages, customer info, tags, assignee, and satisfaction survey data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to retrieve')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      status: z.string().describe('Ticket status'),
      channel: z.string().nullable().describe('Channel'),
      via: z.string().nullable().describe('How the first message was received'),
      subject: z.string().nullable().describe('Ticket subject'),
      priority: z.string().nullable().describe('Ticket priority'),
      language: z.string().nullable().describe('Detected language'),
      spam: z.boolean().describe('Whether the ticket is classified as spam'),
      externalId: z.string().nullable().describe('External system ID'),
      customer: z
        .object({
          customerId: z.number().describe('Customer ID'),
          email: z.string().nullable().describe('Customer email'),
          name: z.string().nullable().describe('Customer name')
        })
        .nullable()
        .describe('Associated customer'),
      assigneeUser: z
        .object({
          userId: z.number().describe('Agent user ID'),
          name: z.string().nullable().describe('Agent name'),
          email: z.string().nullable().describe('Agent email')
        })
        .nullable()
        .describe('Assigned agent'),
      tags: z.array(z.string()).describe('Tag names'),
      messages: z
        .array(
          z.object({
            messageId: z.number().describe('Message ID'),
            channel: z.string().nullable().describe('Message channel'),
            fromAgent: z.boolean().describe('Whether sent by an agent'),
            bodyText: z.string().nullable().describe('Plain text body'),
            senderEmail: z.string().nullable().describe('Sender email'),
            createdDatetime: z.string().nullable().describe('When the message was created')
          })
        )
        .describe('Ticket messages'),
      createdDatetime: z.string().nullable().describe('When the ticket was created'),
      updatedDatetime: z.string().nullable().describe('When the ticket was last updated'),
      closedDatetime: z.string().nullable().describe('When the ticket was closed'),
      meta: z.record(z.string(), z.any()).nullable().describe('Custom metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let t = await client.getTicket(ctx.input.ticketId);

    return {
      output: {
        ticketId: t.id,
        status: t.status,
        channel: t.channel || null,
        via: t.via || null,
        subject: t.subject || null,
        priority: t.priority || null,
        language: t.language || null,
        spam: t.spam || false,
        externalId: t.external_id || null,
        customer: t.customer
          ? {
              customerId: t.customer.id,
              email: t.customer.email || null,
              name: t.customer.name || null
            }
          : null,
        assigneeUser: t.assignee_user
          ? {
              userId: t.assignee_user.id,
              name:
                [t.assignee_user.firstname, t.assignee_user.lastname]
                  .filter(Boolean)
                  .join(' ') || null,
              email: t.assignee_user.email || null
            }
          : null,
        tags: (t.tags || []).map((tag: any) => tag.name),
        messages: (t.messages || []).map((m: any) => ({
          messageId: m.id,
          channel: m.channel || null,
          fromAgent: m.from_agent || false,
          bodyText: m.body_text || null,
          senderEmail: m.sender?.email || null,
          createdDatetime: m.created_datetime || null
        })),
        createdDatetime: t.created_datetime || null,
        updatedDatetime: t.updated_datetime || null,
        closedDatetime: t.closed_datetime || null,
        meta: t.meta || null
      },
      message: `Retrieved ticket **#${t.id}** — "${t.subject || 'No subject'}" (${t.status}) with ${(t.messages || []).length} message(s).`
    };
  })
  .build();
