import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { frontServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a new outbound message or reply to an existing conversation. When providing a channelId, creates a new conversation. When providing a conversationId, sends a reply in that conversation. Requires the **Send** permission.`,
  instructions: [
    'Provide either channelId (for new messages) or conversationId (for replies), not both.',
    'Use body for HTML content and text for the plain-text alternative.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      channelId: z
        .string()
        .optional()
        .describe('Channel ID to send a new message from (for starting new conversations)'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID to reply to (for replies)'),
      authorId: z.string().optional().describe('Teammate ID of the message author'),
      to: z.array(z.string()).optional().describe('Recipient email addresses or handles'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      subject: z.string().optional().describe('Message subject line'),
      body: z.string().describe('Message body content (HTML or markdown)'),
      text: z.string().optional().describe('Plain-text body for email messages'),
      quoteBody: z
        .string()
        .optional()
        .describe('Quoted body for a reply. Only used when conversationId is provided.'),
      senderName: z.string().optional().describe('Display name of the sender'),
      signatureId: z.string().optional().describe('Signature ID to attach for email channels'),
      shouldAddDefaultSignature: z
        .boolean()
        .optional()
        .describe(
          'Whether Front should try to resolve the default signature for email channels'
        )
    })
  )
  .output(
    z.object({
      sent: z.boolean(),
      messageId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.channelId && input.conversationId) {
      throw frontServiceError('Provide either channelId or conversationId, not both.');
    }

    if (!input.channelId && !input.conversationId) {
      throw frontServiceError('Provide either channelId or conversationId.');
    }

    if (input.quoteBody && !input.conversationId) {
      throw frontServiceError('quoteBody can only be used when replying with conversationId.');
    }

    if (input.channelId && !input.to?.length && !input.cc?.length && !input.bcc?.length) {
      throw frontServiceError('At least one of to, cc, or bcc is required for a new message.');
    }

    if (input.conversationId) {
      await client.replyToConversation(input.conversationId, {
        author_id: input.authorId,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        text: input.text,
        quote_body: input.quoteBody,
        sender_name: input.senderName,
        signature_id: input.signatureId,
        should_add_default_signature: input.shouldAddDefaultSignature
      });

      return {
        output: { sent: true },
        message: `Reply sent to conversation ${input.conversationId}.`
      };
    } else if (input.channelId) {
      let message = await client.sendNewMessage(input.channelId, {
        author_id: input.authorId,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        text: input.text,
        sender_name: input.senderName,
        signature_id: input.signatureId,
        should_add_default_signature: input.shouldAddDefaultSignature
      });

      return {
        output: { sent: true, messageId: message.id },
        message: `New message sent via channel ${input.channelId}.`
      };
    }

    throw frontServiceError('Provide either channelId or conversationId.');
  });
