import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateConversation = SlateTool.create(spec, {
  name: 'Update Conversation',
  key: 'update_conversation',
  description: `Update an existing conversation's properties. Change status, assignee, subject, primary customer, mailbox, tags, or custom fields. Multiple updates can be applied at once.`,
  instructions: [
    'tags replaces the full tag list on the conversation; include existing tags you want to keep. Tags that do not exist yet are created automatically.',
    'customFields only changes the listed fields; other custom field values on the conversation are preserved.',
    'Call list_mailboxes with a mailboxId to discover custom field IDs and dropdown option IDs.'
  ]
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
        .describe(
          'User or team ID to assign the conversation to. Use null to unassign. Call list_users or list_teams to discover IDs.'
        ),
      subject: z.string().optional().describe('New conversation subject'),
      customerId: z
        .number()
        .optional()
        .describe('Change the primary customer of the conversation to this customer ID'),
      mailboxId: z
        .number()
        .optional()
        .describe('Move the conversation to another mailbox (mailbox ID from list_mailboxes)'),
      tags: z.array(z.string()).optional().describe('Replace all tags with this list'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            value: z
              .string()
              .describe(
                'Custom field value. Dropdown fields take the option ID, date fields use YYYY-MM-DD. Use an empty string to clear the field.'
              )
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
    let { conversationId } = ctx.input;
    let updated: string[] = [];

    let hasUpdate =
      ctx.input.status !== undefined ||
      ctx.input.assignTo !== undefined ||
      ctx.input.subject !== undefined ||
      ctx.input.customerId !== undefined ||
      ctx.input.mailboxId !== undefined ||
      ctx.input.tags !== undefined ||
      ctx.input.customFields !== undefined;

    if (!hasUpdate) {
      throw helpscoutServiceError('Provide at least one conversation field to update.');
    }

    // Help Scout's conversation PATCH endpoint accepts one operation per request.
    // https://developer.helpscout.com/mailbox-api/endpoints/conversations/update/
    if (ctx.input.subject !== undefined) {
      await client.patchConversation(conversationId, {
        op: 'replace',
        path: '/subject',
        value: ctx.input.subject
      });
      updated.push('subject');
    }

    if (ctx.input.customerId !== undefined) {
      await client.patchConversation(conversationId, {
        op: 'replace',
        path: '/primaryCustomer.id',
        value: ctx.input.customerId
      });
      updated.push('customer');
    }

    if (ctx.input.mailboxId !== undefined) {
      await client.patchConversation(conversationId, {
        op: 'move',
        path: '/mailboxId',
        value: ctx.input.mailboxId
      });
      updated.push('mailbox');
    }

    if (ctx.input.status !== undefined) {
      await client.patchConversation(conversationId, {
        op: 'replace',
        path: '/status',
        value: ctx.input.status
      });
      updated.push('status');
    }

    if (ctx.input.assignTo !== undefined) {
      await client.patchConversation(
        conversationId,
        ctx.input.assignTo === null
          ? { op: 'remove', path: '/assignTo' }
          : { op: 'replace', path: '/assignTo', value: ctx.input.assignTo }
      );
      updated.push('assignee');
    }

    if (ctx.input.tags !== undefined) {
      await client.updateConversationTags(conversationId, ctx.input.tags);
      updated.push('tags');
    }

    if (ctx.input.customFields !== undefined) {
      // The fields endpoint replaces the full set of user-defined custom fields,
      // so merge the requested values into the current ones.
      // https://developer.helpscout.com/mailbox-api/endpoints/conversations/custom_fields/update/
      let current = await client.getConversation(conversationId);
      let merged = new Map<number, string>();
      let systemFieldIds = new Set<number>();
      for (let field of current?.customFields ?? []) {
        if (typeof field?.id !== 'number') continue;
        if (field.systemType) {
          // Omitted system fields keep their value, so they are only sent when requested.
          systemFieldIds.add(field.id);
          continue;
        }
        if (field.value === null || field.value === undefined) continue;
        merged.set(field.id, String(field.value));
      }
      for (let field of ctx.input.customFields) {
        if (field.value === '' && !systemFieldIds.has(field.fieldId)) {
          // Leaving a user-defined field out of the payload clears it.
          merged.delete(field.fieldId);
        } else {
          merged.set(field.fieldId, field.value);
        }
      }

      await client.updateConversationCustomFields(
        conversationId,
        [...merged.entries()].map(([id, value]) => ({ id, value }))
      );
      updated.push('customFields');
    }

    return {
      output: {
        conversationId,
        updated
      },
      message: `Updated conversation **#${conversationId}**: ${updated.join(', ')}.`
    };
  })
  .build();
