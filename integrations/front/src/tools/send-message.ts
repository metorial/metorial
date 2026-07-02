import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a new outbound message or reply to an existing conversation. When providing a channelId, creates a new conversation. When providing a conversationId, sends a reply in that conversation. Requires the **Send** permission.`,
  instructions: [
    'Provide either channelId (for new messages) or conversationId (for replies), not both.',
    'The body supports HTML by default. Set bodyFormat to "markdown" for markdown content.'
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
      to: z.array(z.string()).describe('Recipient email addresses or handles'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      subject: z.string().optional().describe('Message subject line'),
      body: z.string().describe('Message body content (HTML or markdown)'),
      bodyFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Format of the body content'),
      senderName: z.string().optional().describe('Display name of the sender')
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

    if (input.conversationId) {
      await client.replyToConversation(input.conversationId, {
        author_id: input.authorId,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        body: input.body,
        body_format: input.bodyFormat,
        sender_name: input.senderName
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
        body_format: input.bodyFormat,
        sender_name: input.senderName
      });

      return {
        output: { sent: true, messageId: message.id },
        message: `New message sent via channel ${input.channelId} to ${input.to.join(', ')}.`
      };
    }

    return {
      output: { sent: false },
      message: `No message sent — provide either a channelId or conversationId.`
    };
  });
