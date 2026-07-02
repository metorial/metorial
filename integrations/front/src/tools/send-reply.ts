import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendReply = SlateTool.create(spec, {
  name: 'Reply to Conversation',
  key: 'send_reply',
  description: `Send a reply to an existing Front conversation. The reply will be sent to the conversation's recipients. Requires the **Send** permission.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to reply to'),
      authorId: z.string().optional().describe('Teammate ID of the reply author'),
      to: z.array(z.string()).optional().describe('Override recipient addresses'),
      cc: z.array(z.string()).optional().describe('CC recipients'),
      bcc: z.array(z.string()).optional().describe('BCC recipients'),
      subject: z.string().optional().describe('Override subject line'),
      body: z.string().describe('Reply body content (HTML or markdown)'),
      bodyFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Format of the body content'),
      channelId: z.string().optional().describe('Channel ID to send the reply from')
    })
  )
  .output(
    z.object({
      sent: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.replyToConversation(ctx.input.conversationId, {
      author_id: ctx.input.authorId,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject: ctx.input.subject,
      body: ctx.input.body,
      body_format: ctx.input.bodyFormat,
      channel_id: ctx.input.channelId
    });

    return {
      output: { sent: true },
      message: `Reply sent to conversation ${ctx.input.conversationId}.`
    };
  });
