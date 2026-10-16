import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let manageEventManagers = SlateTool.create(spec, {
  name: 'Manage Event Managers',
  key: 'manage_event_managers',
  description:
    'Invite event managers to view an event’s signees and participants, or revoke their access. Discover event IDs with list_events. Inviting can send email to the specified managers.',
  instructions: [
    'Use invite to grant access and remove to revoke access.',
    'managerEmailMessage and skipSendingEmailIfAccountExists apply only to invite.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['invite', 'remove'])
        .describe('Whether to invite managers or revoke access'),
      eventId: z.string().min(1).describe('Event ID from list_events'),
      emailAddresses: z
        .string()
        .min(1)
        .describe('Manager email addresses separated by commas or line breaks'),
      managerEmailMessage: z
        .string()
        .optional()
        .describe('Optional message in invitation emails; invite only'),
      skipSendingEmailIfAccountExists: z
        .boolean()
        .optional()
        .describe('Skip invitation email for an existing account; invite only')
    })
  )
  .output(z.object({ result: z.any().describe('Complete provider operation response') }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.action === 'remove' &&
      (ctx.input.managerEmailMessage !== undefined ||
        ctx.input.skipSendingEmailIfAccountExists !== undefined)
    ) {
      throw createApiServiceError(
        'Invitation options are only supported for the invite action.'
      );
    }
    let client = new WaiverFileClient(ctx.auth);
    let result =
      ctx.input.action === 'invite'
        ? await client.inviteEventManagers(ctx.input)
        : await client.removeEventManagers(ctx.input);
    return { output: { result }, message: 'Received the event manager operation response.' };
  })
  .build();
