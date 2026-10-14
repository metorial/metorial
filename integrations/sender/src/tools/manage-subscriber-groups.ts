import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriberGroups = SlateTool.create(spec, {
  name: 'Manage Subscriber Groups',
  key: 'manage_subscriber_groups',
  description: `Adds or removes subscribers from a group. Provide the group ID, an action (add or remove), and a list of subscriber email addresses. Returns individual results when available, or an overall confirmation when Sender omits the per-subscriber breakdown.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to manage'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove subscribers from the group'),
      emails: z.array(z.string()).min(1).describe('Array of subscriber email addresses'),
      triggerAutomation: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to trigger automation workflows (only applicable for "add" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the provider confirmed the request'),
      confirmationMessage: z
        .string()
        .optional()
        .describe('Provider confirmation when individual results are unavailable'),
      successful: z
        .array(z.string())
        .describe('Email addresses that were successfully processed'),
      alreadyInState: z
        .array(z.string())
        .describe('Email addresses already in the target state'),
      nonExisting: z.array(z.string()).describe('Email addresses not found in the system'),
      invalidEmails: z.array(z.string()).describe('Invalid email addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'add') {
      let result = await client.addSubscribersToGroup(
        ctx.input.groupId,
        ctx.input.emails,
        ctx.input.triggerAutomation
      );

      let successful =
        result.message.subscribers_added_to_group ??
        result.message.subscribers_add_tag_group ??
        [];
      return {
        output: {
          successful,
          alreadyInState: result.message.subscribers_with_group_already ?? [],
          nonExisting: result.message.non_existing_subscribers ?? [],
          invalidEmails: result.message.invalid_emails ?? []
        },
        message: `Added **${successful.length}** subscriber(s) to group \`${ctx.input.groupId}\`.`
      };
    } else {
      let result = await client.removeSubscribersFromGroup(
        ctx.input.groupId,
        ctx.input.emails
      );

      if (result.success === false) {
        throw createApiServiceError('Sender did not confirm the group removal request.');
      }
      if (typeof result.message === 'string') {
        return {
          output: {
            success: result.success,
            confirmationMessage: result.message,
            successful: [],
            alreadyInState: [],
            nonExisting: [],
            invalidEmails: []
          },
          message: `Group removal request completed. ${result.message} Sender did not return individual subscriber results.`
        };
      }
      let successful =
        result.message.subscribers_removed_from_group ??
        result.message.subscribers_remove_tag_group ??
        [];
      return {
        output: {
          success: result.success,
          successful,
          alreadyInState: result.message.subscribers_without_group_already ?? [],
          nonExisting: result.message.non_existing_subscribers ?? [],
          invalidEmails: result.message.invalid_emails ?? []
        },
        message: `Removed **${successful.length}** subscriber(s) from group \`${ctx.input.groupId}\`.`
      };
    }
  })
  .build();
