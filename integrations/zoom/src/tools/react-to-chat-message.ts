import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZOOM_USER_AUTH_METHODS } from '../lib/authMethods';
import { assertChatRecipient, describeChatRecipient } from '../lib/chatRecipient';
import { ZoomClient } from '../lib/client';
import { zoomServiceError } from '../lib/errors';
import { spec } from '../spec';

let VARIATION_SELECTOR_16 = 0xfe0f;

// Zoom identifies reaction emoji by Unicode code point in `U+1F600` form.
let toZoomEmoji = (value: string) => {
  let trimmed = value.trim();
  let codePoint = /^U\+([0-9a-f]{4,6})$/i.exec(trimmed);
  if (codePoint) return `U+${codePoint[1]!.toUpperCase()}`;

  let points = Array.from(trimmed)
    .map(char => char.codePointAt(0)!)
    .filter(point => point !== VARIATION_SELECTOR_16);
  if (points.length === 1) return `U+${points[0]!.toString(16).toUpperCase()}`;

  throw zoomServiceError(
    'Provide a single emoji character or its Unicode code point, for example 👍 or U+1F44D.'
  );
};

// https://developers.zoom.us/docs/api/team-chat/#tag/chat-messages/PATCH/chat/users/{userId}/messages/{messageId}/emoji_reactions
export let reactToChatMessage = SlateTool.create(spec, {
  name: 'React to Chat Message',
  key: 'react_to_chat_message',
  description: `Add or remove an emoji reaction on a Zoom Team Chat message in a channel or direct conversation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email reacting. Use "me" for the authenticated user'),
      messageId: z.string().min(1).describe('ID of the message to react to'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the reaction'),
      emoji: z
        .string()
        .min(1)
        .describe(
          'A single-code-point emoji (👍) or its Unicode code point (U+1F44D). Skin-tone, flag, and combined emoji are not supported.'
        ),
      toChannel: z.string().optional().describe('Channel ID where the message was posted'),
      toContact: z
        .string()
        .optional()
        .describe('Email, user ID, or member ID of the contact for a direct message')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the reaction change was accepted'),
      emoji: z.string().describe('Emoji code point sent to Zoom, for example U+1F44D')
    })
  )
  .authMethods(ZOOM_USER_AUTH_METHODS)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    assertChatRecipient(input.toChannel, input.toContact, 'to react to a chat message');
    let emoji = toZoomEmoji(input.emoji);

    let client = new ZoomClient(ctx.auth.token);
    await client.reactToChatMessage(input.messageId, input.userId, {
      action: input.action,
      emoji,
      toChannel: input.toChannel,
      toContact: input.toContact
    });

    let recipient = describeChatRecipient(input.toChannel, input.toContact);
    return {
      output: { success: true, emoji },
      message:
        input.action === 'add'
          ? `Added ${emoji} to message **${input.messageId}** in ${recipient}.`
          : `Removed ${emoji} from message **${input.messageId}** in ${recipient}.`
    };
  })
  .build();
