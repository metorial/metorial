import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update an existing conversation's properties. Change status, assignee, subject, tags, or custom fields. Multiple updates can be applied at once.`
})
  .input(
    z.object({
      conversationId: z.number().describe('The conversation ID to update'),
      status: z
        .enum(['active', 'pending', 'closed', 'spam'])
        .optional()
        .describe('New conversation status'),
      assignTo: z
        .number()
        .nullable()
        .optional()
        .describe('User ID to assign the conversation to. Use null to unassign.'),
      subject: z.string().optional().describe('New conversation subject'),
      tags: z.array(z.string()).optional().describe('Replace all tags with this list'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to set')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Updated conversation ID'),
      updated: z.array(z.string()).describe('List of fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let updated: string[] = [];

    if (ctx.input.status) {
      await client.updateConversationStatus(ctx.input.conversationId, ctx.input.status);
      updated.push('status');
    }

    if (ctx.input.assignTo !== undefined) {
      await client.assignConversation(ctx.input.conversationId, ctx.input.assignTo);
      updated.push('assignee');
    }

    if (ctx.input.subject) {
      await client.updateConversation(ctx.input.conversationId, [
        { op: 'replace', path: '/subject', value: ctx.input.subject }
      ]);
      updated.push('subject');
    }

    if (ctx.input.tags) {
      await client.updateConversationTags(ctx.input.conversationId, ctx.input.tags);
      updated.push('tags');
    }

    if (ctx.input.customFields) {
      await client.updateConversationCustomFields(
        ctx.input.conversationId,
        ctx.input.customFields.map(f => ({ id: f.fieldId, value: f.value }))
      );
      updated.push('customFields');
    }

    if (updated.length === 0) {
      throw helpscoutServiceError('Provide at least one conversation field to update.');
    }

    return {
      output: {
        conversationId: ctx.input.conversationId,
        updated
      },
      message: `Updated conversation **#${ctx.input.conversationId}**: ${updated.join(', ')}.`
    };
  })
  .build();
