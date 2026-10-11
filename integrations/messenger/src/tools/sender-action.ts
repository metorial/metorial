import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

export let senderAction = SlateTool.create(spec, {
  name: 'Send Sender Action',
  key: 'send_sender_action',
  description: `Display a typing indicator, mark a conversation as read, or react to a message in a Messenger conversation. Use **typing_on** to show a typing bubble, **typing_off** to hide it, **mark_seen** to show a read receipt, **react** to add or change the Page's emoji reaction on a message, and **unreact** to remove it.`,
  instructions: [
    'For react, provide messageId and reaction (a single emoji). Reacting again replaces the Page’s previous reaction on that message.',
    'For unreact, provide messageId only.'
  ],
  constraints: ['The Page can have only one reaction on each message.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('Page-Scoped User ID (PSID) of the recipient'),
      action: z
        .enum(['typing_on', 'typing_off', 'mark_seen', 'react', 'unreact'])
        .describe(
          'Sender action: typing_on (show typing), typing_off (hide typing), mark_seen (read receipt), react (add or change a reaction), unreact (remove the reaction)'
        ),
      messageId: z
        .string()
        .min(1)
        .optional()
        .describe('Message ID (mid) to react to. Required for react and unreact.'),
      reaction: z
        .string()
        .min(1)
        .optional()
        .describe('Emoji to react with, such as 👍 or ❤️. Required for react.')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('PSID of the recipient'),
      success: z.boolean().describe('Whether the action was applied successfully'),
      messageId: z.string().optional().describe('Message ID the reaction applies to')
    })
  )
  .handleInvocation(async ctx => {
    let { input } = ctx;
    let isReaction = input.action === 'react' || input.action === 'unreact';

    if (isReaction && !input.messageId) {
      throw messengerServiceError(`messageId is required for the ${input.action} action`);
    }
    if (input.action === 'react' && !input.reaction) {
      throw messengerServiceError('reaction is required for the react action');
    }
    if (!isReaction && (input.messageId || input.reaction)) {
      throw messengerServiceError(
        'messageId and reaction can only be used with the react and unreact actions'
      );
    }
    if (input.action === 'unreact' && input.reaction) {
      throw messengerServiceError('reaction cannot be used with the unreact action');
    }

    let client = createMessengerClient(ctx);

    await client.sendSenderAction(
      input.recipientId,
      input.action,
      isReaction
        ? {
            messageId: input.messageId as string,
            reaction: input.action === 'react' ? input.reaction : undefined
          }
        : undefined
    );

    let actionLabel = {
      typing_on: 'Typing indicator shown',
      typing_off: 'Typing indicator hidden',
      mark_seen: 'Conversation marked as read',
      react: `Reacted ${input.reaction ?? ''} to message ${input.messageId ?? ''}`.trim(),
      unreact: `Reaction removed from message ${input.messageId ?? ''}`.trim()
    }[input.action];

    return {
      output: {
        recipientId: input.recipientId,
        success: true,
        ...(isReaction ? { messageId: input.messageId } : {})
      },
      message: `${actionLabel} for user **${input.recipientId}**.`
    };
  })
  .build();
