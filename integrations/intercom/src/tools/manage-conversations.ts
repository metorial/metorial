import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { booleanOrUndefined, stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let manageConversations = SlateTool.create(spec, {
  name: 'Manage Conversations',
  key: 'manage_conversations',
  description: `Perform actions on Intercom conversations: create new conversations, reply, assign to teammates/teams, add notes, close, open, or snooze.
Combines multiple conversation management operations into a single tool.`,
  instructions: [
    'For "create", provide the contact who initiates the conversation (fromType + fromId) and a message body.',
    'For "reply", specify whether the reply is from an admin or contact, and provide the relevant IDs.',
    'For "assign", provide both the performing adminId and the target assigneeId.',
    'For "snooze", provide a snoozedUntil ISO 8601 timestamp.',
    'For "add_note", only admins can add internal notes.',
    'For "update", provide read and/or customAttributes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'reply', 'assign', 'close', 'open', 'snooze', 'add_note'])
        .describe('Operation to perform'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID (required for all actions except create)'),
      fromType: z
        .enum(['user', 'lead', 'contact'])
        .optional()
        .describe('Type of the contact initiating the conversation (for create)'),
      fromId: z
        .string()
        .optional()
        .describe('Contact ID initiating the conversation (for create)'),
      body: z.string().optional().describe('Message body (HTML supported)'),
      read: z.boolean().optional().describe('Mark the conversation as read or unread'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Conversation custom attributes to update'),
      adminId: z.string().optional().describe('Admin ID performing the action'),
      replyType: z
        .enum(['admin', 'user'])
        .optional()
        .describe('Who is replying (for reply action)'),
      intercomUserId: z
        .string()
        .optional()
        .describe('Intercom user ID when replying as a contact'),
      email: z
        .string()
        .optional()
        .describe('Contact email when replying on behalf of a contact'),
      assigneeId: z
        .string()
        .optional()
        .describe('Admin or team ID to assign to (for assign action)'),
      assigneeType: z
        .enum(['admin', 'team'])
        .optional()
        .describe('Whether assigning to admin or team'),
      snoozedUntil: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to snooze until (for snooze action)'),
      attachmentUrls: z
        .array(z.string())
        .optional()
        .describe('URLs of attachments to include in reply')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      state: z.string().optional().describe('Conversation state'),
      title: z.string().optional().describe('Conversation title'),
      open: z.boolean().optional().describe('Whether conversation is open'),
      read: z.boolean().optional().describe('Whether conversation has been read'),
      priority: z.string().optional().describe('Conversation priority'),
      snoozedUntil: z.string().optional().describe('Snoozed until timestamp'),
      assigneeId: z.string().optional().describe('Current assignee ID'),
      assigneeType: z.string().optional().describe('Current assignee type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.fromType || !ctx.input.fromId || !ctx.input.body) {
        throw intercomServiceError('fromType, fromId, and body are required for create');
      }
      let result = await client.createConversation({
        from: { type: ctx.input.fromType, id: ctx.input.fromId },
        body: ctx.input.body
      });
      return {
        output: mapConversation(result),
        message: `Created conversation **${result.conversation_id || result.id}**`
      };
    }

    if (!ctx.input.conversationId) throw intercomServiceError('conversationId is required');

    if (action === 'update') {
      if (ctx.input.read === undefined && !ctx.input.customAttributes) {
        throw intercomServiceError('read or customAttributes is required for update');
      }
      let result = await client.updateConversation(ctx.input.conversationId, {
        read: ctx.input.read,
        customAttributes: ctx.input.customAttributes
      });
      return {
        output: mapConversation(result),
        message: `Updated conversation **${ctx.input.conversationId}**`
      };
    }

    if (action === 'reply') {
      if (!ctx.input.body) throw intercomServiceError('body is required for reply');
      let replyType = ctx.input.replyType || 'admin';
      let result = await client.replyToConversation(ctx.input.conversationId, {
        messageType: 'comment',
        type: replyType,
        body: ctx.input.body,
        adminId: ctx.input.adminId,
        intercomUserId: ctx.input.intercomUserId,
        email: ctx.input.email,
        attachmentUrls: ctx.input.attachmentUrls
      });
      return {
        output: mapConversation(result),
        message: `Replied to conversation **${ctx.input.conversationId}** as ${replyType}`
      };
    }

    if (action === 'assign') {
      if (!ctx.input.adminId || !ctx.input.assigneeId) {
        throw intercomServiceError('adminId and assigneeId are required for assign');
      }
      let result = await client.assignConversation(ctx.input.conversationId, {
        adminId: ctx.input.adminId,
        assigneeId: ctx.input.assigneeId,
        body: ctx.input.body,
        type: 'admin'
      });
      return {
        output: mapConversation(result),
        message: `Assigned conversation **${ctx.input.conversationId}** to ${ctx.input.assigneeId}`
      };
    }

    if (action === 'close') {
      if (!ctx.input.adminId) throw intercomServiceError('adminId is required for close');
      let result = await client.closeConversation(
        ctx.input.conversationId,
        ctx.input.adminId,
        ctx.input.body
      );
      return {
        output: mapConversation(result),
        message: `Closed conversation **${ctx.input.conversationId}**`
      };
    }

    if (action === 'open') {
      if (!ctx.input.adminId) throw intercomServiceError('adminId is required for open');
      let result = await client.openConversation(ctx.input.conversationId, ctx.input.adminId);
      return {
        output: mapConversation(result),
        message: `Opened conversation **${ctx.input.conversationId}**`
      };
    }

    if (action === 'snooze') {
      if (!ctx.input.adminId || !ctx.input.snoozedUntil) {
        throw intercomServiceError('adminId and snoozedUntil are required for snooze');
      }
      let snoozedUntilTs = Math.floor(new Date(ctx.input.snoozedUntil).getTime() / 1000);
      let result = await client.snoozeConversation(
        ctx.input.conversationId,
        ctx.input.adminId,
        snoozedUntilTs
      );
      return {
        output: mapConversation(result),
        message: `Snoozed conversation **${ctx.input.conversationId}** until ${ctx.input.snoozedUntil}`
      };
    }

    if (action === 'add_note') {
      if (!ctx.input.adminId || !ctx.input.body) {
        throw intercomServiceError('adminId and body are required for add_note');
      }
      let result = await client.addNoteToConversation(
        ctx.input.conversationId,
        ctx.input.adminId,
        ctx.input.body
      );
      return {
        output: mapConversation(result),
        message: `Added note to conversation **${ctx.input.conversationId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();

let mapConversation = (data: any) => ({
  conversationId: String(data.conversation_id || data.id),
  state: stringOrUndefined(data.state),
  title: stringOrUndefined(data.title),
  open: booleanOrUndefined(data.open),
  read: booleanOrUndefined(data.read),
  priority: stringOrUndefined(data.priority),
  snoozedUntil: timestampOrUndefined(data.snoozed_until),
  assigneeId: data.assignee?.id ? String(data.assignee.id) : undefined,
  assigneeType: stringOrUndefined(data.assignee?.type),
  createdAt: timestampOrUndefined(data.created_at),
  updatedAt: timestampOrUndefined(data.updated_at)
});
