import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggers when a ticket is created, updated, status changes, assigned, resolved, or receives a comment. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of ticket event'),
      ticketId: z.number().describe('Ticket ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      number: z.string().optional().describe('Ticket number'),
      subject: z.string().optional().describe('Ticket subject'),
      description: z.string().optional().describe('Problem description'),
      status: z.string().optional().describe('Ticket status'),
      priority: z.string().optional().describe('Priority level'),
      customerId: z.number().optional().describe('Associated customer ID'),
      customerName: z.string().optional().describe('Customer name'),
      assignedTo: z.string().optional().describe('Assigned technician'),
      ticketType: z.string().optional().describe('Ticket type'),
      dueDate: z.string().optional().describe('Due date'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let ticket = body.ticket || body;
      let ticketId = ticket.id || ticket.ticket_id;
      if (!ticketId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'updated';

      return {
        inputs: [
          {
            eventType: String(eventType),
            ticketId: Number(ticketId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ticket = ctx.input.webhookPayload?.ticket || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      // Normalize event type
      if (eventType.includes('creat') || eventType.includes('new')) {
        eventType = 'created';
      } else if (eventType.includes('resolv') || eventType.includes('clos')) {
        eventType = 'resolved';
      } else if (eventType.includes('status') || eventType.includes('chang')) {
        eventType = 'status_changed';
      } else if (eventType.includes('assign')) {
        eventType = 'assigned';
      } else if (eventType.includes('comment')) {
        eventType = 'comment_added';
      } else if (eventType.includes('delet')) {
        eventType = 'deleted';
      } else {
        eventType = 'updated';
      }

      return {
        type: `ticket.${eventType}`,
        id: `ticket_${ctx.input.ticketId}_${eventType}_${ticket.updated_at || Date.now()}`,
        output: {
          ticketId: ctx.input.ticketId,
          number: ticket.number?.toString(),
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          customerId: ticket.customer_id,
          customerName: ticket.customer_business_then_name,
          assignedTo: ticket.assigned_to?.toString(),
          ticketType: ticket.ticket_type,
          dueDate: ticket.due_date,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at
        }
      };
    }
  })
  .build();
