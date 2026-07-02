import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let createClient = (ctx: { auth: any; config: any }) =>
  new Client({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain,
    authType: ctx.auth.authType
  });

let mapConversation = (conversation: Record<string, any>, ticketId?: number) => ({
  conversationId: conversation.id,
  ticketId: conversation.ticket_id ?? ticketId ?? null,
  bodyText: conversation.body_text ?? null,
  body: conversation.body ?? null,
  private: conversation.private ?? null,
  userId: conversation.user_id ?? null,
  source: conversation.source ?? null,
  createdAt: conversation.created_at ?? null,
  updatedAt: conversation.updated_at ?? null
});

let mapField = (field: Record<string, any>) => ({
  fieldId: String(field.id ?? field.name ?? field.field_name),
  name: field.name ?? field.label ?? field.field_name,
  label: field.label ?? field.name ?? field.field_name ?? null,
  type: field.type ?? field.field_type ?? null,
  requiredForAgents: field.required_for_agents ?? null,
  requiredForRequesters: field.required_for_requesters ?? null,
  default: field.default ?? null,
  choices: field.choices ?? field.nested_fields ?? null
});

export let restoreTicket = SlateTool.create(spec, {
  name: 'Restore Ticket',
  key: 'restore_ticket',
  description: 'Restore a deleted Freshservice ticket.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the deleted ticket to restore')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the restored ticket'),
      restored: z.boolean().describe('Whether the restore was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.restoreTicket(ctx.input.ticketId);

    return {
      output: { ticketId: ctx.input.ticketId, restored: true },
      message: `Restored ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();

export let listTicketConversations = SlateTool.create(spec, {
  name: 'List Ticket Conversations',
  key: 'list_ticket_conversations',
  description: 'List replies and notes on a Freshservice ticket.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.number().describe('Conversation ID'),
            ticketId: z.number().nullable().describe('Ticket ID'),
            bodyText: z.string().nullable().describe('Plain text body'),
            body: z.string().nullable().describe('HTML body'),
            private: z.boolean().nullable().describe('Whether the note is private'),
            userId: z.number().nullable().describe('Author user ID'),
            source: z.number().nullable().describe('Freshservice conversation source'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Ticket conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let conversations = (
      await client.listTicketConversations(ctx.input.ticketId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      })
    ).map((conversation: Record<string, any>) =>
      mapConversation(conversation, ctx.input.ticketId)
    );

    return {
      output: { conversations },
      message: `Found **${conversations.length}** conversations on ticket #${ctx.input.ticketId}`
    };
  })
  .build();

export let updateTicketConversation = SlateTool.create(spec, {
  name: 'Update Ticket Conversation',
  key: 'update_ticket_conversation',
  description: 'Update the body of a Freshservice ticket conversation.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.number().describe('ID of the conversation to update'),
      body: z.string().describe('Updated HTML body')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      bodyText: z.string().nullable().describe('Updated plain text body'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let conversation = await client.updateTicketConversation(
      ctx.input.conversationId,
      ctx.input.body
    );

    return {
      output: {
        conversationId: conversation.id,
        bodyText: conversation.body_text ?? null,
        updatedAt: conversation.updated_at ?? null
      },
      message: `Updated conversation **#${conversation.id}**`
    };
  })
  .build();

export let deleteTicketConversation = SlateTool.create(spec, {
  name: 'Delete Ticket Conversation',
  key: 'delete_ticket_conversation',
  description: 'Delete a Freshservice ticket conversation.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.number().describe('ID of the conversation to delete')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Deleted conversation ID'),
      deleted: z.boolean().describe('Whether the deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTicketConversation(ctx.input.conversationId);

    return {
      output: { conversationId: ctx.input.conversationId, deleted: true },
      message: `Deleted conversation **#${ctx.input.conversationId}**`
    };
  })
  .build();

export let getTicketActivities = SlateTool.create(spec, {
  name: 'Get Ticket Activities',
  key: 'get_ticket_activities',
  description: 'Get the activity feed for a Freshservice ticket.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      activities: z.array(z.record(z.string(), z.unknown())).describe('Ticket activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let activities = await client.getTicketActivities(ctx.input.ticketId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: { activities },
      message: `Found **${activities.length}** activities on ticket #${ctx.input.ticketId}`
    };
  })
  .build();

export let listFormFields = SlateTool.create(spec, {
  name: 'List Form Fields',
  key: 'list_form_fields',
  description:
    'List Freshservice form field metadata for tickets, problems, changes, releases, requesters, agents, or departments.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entity: z
        .enum(['ticket', 'problem', 'change', 'release', 'requester', 'agent', 'department'])
        .describe('Freshservice entity whose form fields should be listed'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.string().describe('Field ID or stable name'),
            name: z.string().nullable().describe('Field API name'),
            label: z.string().nullable().describe('Field label'),
            type: z.string().nullable().describe('Field type'),
            requiredForAgents: z.boolean().nullable().describe('Required for agents'),
            requiredForRequesters: z.boolean().nullable().describe('Required for requesters'),
            default: z.unknown().nullable().describe('Default value'),
            choices: z.unknown().nullable().describe('Allowed choices or nested fields')
          })
        )
        .describe('Form fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let fields = (
      await client.listFormFields(ctx.input.entity, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      })
    ).map((field: Record<string, any>) => mapField(field));

    return {
      output: { fields },
      message: `Found **${fields.length}** ${ctx.input.entity} fields`
    };
  })
  .build();
