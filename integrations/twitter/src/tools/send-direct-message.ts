import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendDirectMessage = SlateTool.create(spec, {
  name: 'Send Direct Message',
  key: 'send_direct_message',
  description: `Send a direct message to a user or into an existing conversation. Can also create a new group conversation with an initial message.`,
  instructions: [
    'To message a specific user directly, provide **recipientUserId**.',
    'To send to an existing conversation, provide **conversationId**.',
    'To create a new group conversation, provide **participantIds** (array of user IDs).',
    'Provide **mediaId** to attach one uploaded media item to the message.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Message text to send'),
      recipientUserId: z.string().optional().describe('User ID to send a direct message to'),
      conversationId: z
        .string()
        .optional()
        .describe('Existing conversation ID to send a message to'),
      participantIds: z
        .array(z.string())
        .optional()
        .describe('User IDs for creating a new group conversation'),
      mediaId: z
        .string()
        .optional()
        .describe('Uploaded media ID to attach to the direct message')
    })
  )
  .output(
    z.object({
      eventId: z.string().optional().describe('ID of the sent message event'),
      conversationId: z.string().optional().describe('ID of the conversation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { text, recipientUserId, conversationId, participantIds, mediaId } = ctx.input;

    if (recipientUserId) {
      let result = await client.sendDmToUser(recipientUserId, text, mediaId);
      return {
        output: {
          eventId: result.data?.dm_event_id,
          conversationId: result.data?.dm_conversation_id
        },
        message: `Sent direct message to user ${recipientUserId}.`
      };
    }

    if (conversationId) {
      let result = await client.sendDmToConversation(conversationId, text, mediaId);
      return {
        output: {
          eventId: result.data?.dm_event_id,
          conversationId
        },
        message: `Sent message to conversation ${conversationId}.`
      };
    }

    if (participantIds && participantIds.length > 0) {
      let result = await client.createDmConversation(participantIds, text, mediaId);
      return {
        output: {
          eventId: result.data?.dm_event_id,
          conversationId: result.data?.dm_conversation_id
        },
        message: `Created group conversation with ${participantIds.length} participant(s).`
      };
    }

    throw twitterServiceError('Provide recipientUserId, conversationId, or participantIds.');
  })
  .build();
