import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTickets = SlateTool.create(spec, {
  name: 'Manage Tickets',
  key: 'manage_tickets',
  description: `Create, update, or reply to Intercom tickets. Supports state transitions, assignment, and custom ticket attributes.
Use the "list_ticket_types" action to discover available ticket types before creating tickets.`,
  instructions: [
    'For "create", a ticketTypeId and at least one contact ID are required.',
    'For "update", you can change state, assignment, custom attributes, etc.',
    'Ticket states follow a lifecycle: submitted -> in_progress -> waiting_on_customer -> resolved.',
    'For "reply", specify the adminId for admin replies or intercomUserId for contact replies.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'reply', 'list_ticket_types'])
        .describe('Operation to perform'),
      ticketId: z.string().optional().describe('Ticket ID (required for update, reply)'),
      ticketTypeId: z.string().optional().describe('Ticket type ID (required for create)'),
      contactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to attach (required for create)'),
      ticketAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom ticket attributes as key-value pairs'),
      companyId: z
        .string()
        .optional()
        .describe('Company ID to associate with ticket (for create)'),
      state: z
        .string()
        .optional()
        .describe(
          'Ticket state (for update): submitted, in_progress, waiting_on_customer, resolved'
        ),
      open: z.boolean().optional().describe('Whether ticket is open (for update)'),
      isShared: z.boolean().optional().describe('Whether ticket is shared (for update)'),
      snoozedUntil: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to snooze until (for update)'),
      assignmentAdminId: z
        .string()
        .optional()
        .describe('Admin ID to assign to (for create/update)'),
      assignmentTeamId: z.string().optional().describe('Team ID to assign to (for update)'),
      body: z.string().optional().describe('Reply message body (for reply)'),
      adminId: z.string().optional().describe('Admin ID replying (for reply as admin)'),
      intercomUserId: z
        .string()
        .optional()
        .describe('Contact ID replying (for reply as contact)'),
      replyType: z.enum(['admin', 'user']).optional().describe('Who is replying')
    })
  )
  .output(
    z.object({
      ticketId: z.string().optional().describe('Ticket ID'),
      ticketTypeId: z.string().optional().describe('Ticket type ID'),
      state: z.string().optional().describe('Ticket state'),
      open: z.boolean().optional().describe('Whether ticket is open'),
      subject: z.string().optional().describe('Ticket subject'),
      description: z.string().optional().describe('Ticket description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      ticketTypes: z
        .array(
          z.object({
            ticketTypeId: z.string().describe('Ticket type ID'),
            name: z.string().optional().describe('Ticket type name'),
            description: z.string().optional().describe('Ticket type description'),
            category: z.string().optional().describe('Ticket type category'),
            archived: z.boolean().optional().describe('Whether archived')
          })
        )
        .optional()
        .describe('Available ticket types (for list_ticket_types)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'list_ticket_types') {
      let result = await client.listTicketTypes();
      let types = (result.data || []).map((t: any) => ({
        ticketTypeId: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        archived: t.archived
      }));
      return {
        output: { ticketTypes: types },
        message: `Found **${types.length}** ticket types`
      };
    }

    if (action === 'create') {
      if (!ctx.input.ticketTypeId || !ctx.input.contactIds?.length) {
        throw intercomServiceError('ticketTypeId and contactIds are required for create');
      }
      let result = await client.createTicket({
        ticketTypeId: ctx.input.ticketTypeId,
        contacts: ctx.input.contactIds.map(id => ({ id })),
        ticketAttributes: ctx.input.ticketAttributes,
        companyId: ctx.input.companyId,
        assigneeId: ctx.input.assignmentAdminId
      });
      return {
        output: mapTicket(result),
        message: `Created ticket **${result.id}**`
      };
    }

    if (action === 'update') {
      if (!ctx.input.ticketId) throw intercomServiceError('ticketId is required for update');
      let result = await client.updateTicket(ctx.input.ticketId, {
        ticketAttributes: ctx.input.ticketAttributes,
        state: ctx.input.state,
        open: ctx.input.open,
        isShared: ctx.input.isShared,
        snoozedUntil: ctx.input.snoozedUntil,
        assignmentAdminId: ctx.input.assignmentAdminId,
        assignmentTeamId: ctx.input.assignmentTeamId
      });
      return {
        output: mapTicket(result),
        message: `Updated ticket **${ctx.input.ticketId}**${ctx.input.state ? ` (state: ${ctx.input.state})` : ''}`
      };
    }

    if (action === 'reply') {
      if (!ctx.input.ticketId || !ctx.input.body) {
        throw intercomServiceError('ticketId and body are required for reply');
      }
      let replyType = ctx.input.replyType || 'admin';
      let result = await client.replyToTicket(ctx.input.ticketId, {
        messageType: 'comment',
        type: replyType,
        body: ctx.input.body,
        adminId: ctx.input.adminId,
        intercomUserId: ctx.input.intercomUserId
      });
      return {
        output: mapTicket(result),
        message: `Replied to ticket **${ctx.input.ticketId}** as ${replyType}`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();

let mapTicket = (data: any) => ({
  ticketId: data.id,
  ticketTypeId: data.ticket_type?.id,
  state: data.ticket_state,
  open: data.open,
  subject: data.ticket_attributes?._default_title_,
  description: data.ticket_attributes?._default_description_,
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at ? String(data.updated_at) : undefined
});
