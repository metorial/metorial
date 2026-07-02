import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { crispServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update a conversation's metadata, state, routing assignment, or block status. Combine multiple updates in a single call — set the nickname, assign an operator, change state to resolved, and add segments all at once.`,
  instructions: [
    'To resolve a conversation, set state to "resolved". To reopen, set state to "unresolved".',
    'To assign to an operator, provide assignToOperatorId. To unassign, set unassign to true.',
    'Segments replace the existing list — include all desired segments.'
  ]
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation to update'),
      nickname: z.string().optional().describe('Update visitor nickname'),
      email: z.string().optional().describe('Update visitor email'),
      phone: z.string().optional().describe('Update visitor phone number'),
      address: z.string().optional().describe('Update visitor address'),
      subject: z.string().optional().describe('Update conversation subject'),
      avatar: z.string().optional().describe('Update visitor avatar URL'),
      segments: z
        .array(z.string())
        .optional()
        .describe('Set conversation segments/tags (replaces existing)'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Set custom data key-value pairs'),
      state: z
        .enum(['pending', 'unresolved', 'resolved'])
        .optional()
        .describe('Change conversation state'),
      assignToOperatorId: z
        .string()
        .optional()
        .describe('Assign conversation to operator by user ID'),
      unassign: z.boolean().optional().describe('Unassign the conversation from any operator'),
      inboxId: z.string().optional().describe('Move the conversation to this inbox ID'),
      moveToMainInbox: z
        .boolean()
        .optional()
        .describe('Move the conversation back to the main inbox'),
      blocked: z.boolean().optional().describe('Block or unblock the visitor')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the updated conversation'),
      updated: z.array(z.string()).describe('List of aspects that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let updated: string[] = [];
    let { sessionId } = ctx.input;

    if (ctx.input.assignToOperatorId !== undefined && ctx.input.unassign) {
      throw crispServiceError('Provide either assignToOperatorId or unassign, not both.');
    }

    if (ctx.input.inboxId !== undefined && ctx.input.moveToMainInbox) {
      throw crispServiceError('Provide either inboxId or moveToMainInbox, not both.');
    }

    // Update meta if any meta fields provided
    let meta: Record<string, any> = {};
    if (ctx.input.nickname !== undefined) meta.nickname = ctx.input.nickname;
    if (ctx.input.email !== undefined) meta.email = ctx.input.email;
    if (ctx.input.phone !== undefined) meta.phone = ctx.input.phone;
    if (ctx.input.address !== undefined) meta.address = ctx.input.address;
    if (ctx.input.subject !== undefined) meta.subject = ctx.input.subject;
    if (ctx.input.avatar !== undefined) meta.avatar = ctx.input.avatar;
    if (ctx.input.segments !== undefined) meta.segments = ctx.input.segments;
    if (ctx.input.customData !== undefined) meta.data = ctx.input.customData;

    if (Object.keys(meta).length > 0) {
      await client.updateConversationMeta(sessionId, meta);
      updated.push('meta');
    }

    if (ctx.input.state !== undefined) {
      await client.changeConversationState(sessionId, ctx.input.state);
      updated.push('state');
    }

    if (ctx.input.assignToOperatorId !== undefined) {
      await client.assignConversationRouting(sessionId, {
        user_id: ctx.input.assignToOperatorId
      });
      updated.push('routing');
    } else if (ctx.input.unassign) {
      await client.assignConversationRouting(sessionId, null);
      updated.push('routing');
    }

    if (ctx.input.inboxId !== undefined) {
      await client.updateConversationInbox(sessionId, ctx.input.inboxId);
      updated.push('inbox');
    } else if (ctx.input.moveToMainInbox) {
      await client.updateConversationInbox(sessionId, null);
      updated.push('inbox');
    }

    if (ctx.input.blocked !== undefined) {
      await client.updateConversationBlock(sessionId, ctx.input.blocked);
      updated.push('block');
    }

    if (updated.length === 0) {
      throw crispServiceError('Provide at least one conversation field to update.');
    }

    return {
      output: {
        sessionId,
        updated
      },
      message: `Updated conversation **${sessionId}**: ${updated.join(', ')}.`
    };
  })
  .build();
