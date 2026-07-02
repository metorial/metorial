import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ticketEventTypes = [
  'Ticket_Add',
  'Ticket_Update',
  'Ticket_Delete',
  'Ticket_Comment_Add',
  'Ticket_Comment_Update',
  'Ticket_Thread_Add',
  'Ticket_Approval_Add',
  'Ticket_Approval_Update',
  'Ticket_Attachment_Add',
  'Ticket_Attachment_Update',
  'Ticket_Attachment_Delete'
] as const;

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggered when a ticket is created, updated, deleted, or when comments, threads, approvals, or attachments are added or changed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of ticket event'),
      ticketId: z.string().describe('ID of the affected ticket'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the affected ticket'),
      ticketNumber: z.string().optional().describe('Ticket number'),
      subject: z.string().optional().describe('Ticket subject'),
      status: z.string().optional().describe('Ticket status'),
      priority: z.string().optional().describe('Ticket priority'),
      assigneeId: z.string().optional().describe('Assigned agent ID'),
      contactId: z.string().optional().describe('Contact ID'),
      departmentId: z.string().optional().describe('Department ID'),
      channel: z.string().optional().describe('Ticket channel'),
      previousState: z
        .any()
        .optional()
        .describe('Previous state of the ticket (for update events)'),
      relatedResourceId: z
        .string()
        .optional()
        .describe('ID of the related resource (comment, thread, attachment, approval)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhookIds: string[] = [];

      for (let eventType of ticketEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType === 'Ticket_Update') {
            webhookData.includePrevState = true;
          }

          if (eventType === 'Ticket_Thread_Add') {
            webhookData.direction = 'in';
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch (_err) {
          // Some events may not be supported on all editions; continue with others
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let ticket = data.payload || data.ticket || data;
      let ticketId = ticket.id || ticket.ticketId || data.ticketId || '';

      return {
        inputs: [
          {
            eventType,
            ticketId: String(ticketId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, ticketId, payload } = ctx.input;
      let ticket = payload?.payload || payload?.ticket || payload || {};

      let normalizedType = eventType
        .replace(/^Ticket_/, 'ticket.')
        .replace(/_/g, '_')
        .toLowerCase();

      return {
        type: normalizedType,
        id: `${ticketId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          ticketId,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          assigneeId: ticket.assigneeId,
          contactId: ticket.contactId,
          departmentId: ticket.departmentId,
          channel: ticket.channel,
          previousState: ticket.prevState || payload?.prevState,
          relatedResourceId:
            ticket.commentId || ticket.threadId || ticket.attachmentId || ticket.approvalId
        }
      };
    }
  })
  .build();
