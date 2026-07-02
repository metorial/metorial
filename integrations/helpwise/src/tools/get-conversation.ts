import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve full details of a specific conversation including its messages, assigned agent, status, tags, and metadata. Optionally include the conversation's messages for a complete view.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to retrieve'),
      mailboxId: z.string().optional().describe('Mailbox ID the conversation belongs to'),
      includeMessages: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch messages for this conversation')
    })
  )
  .output(
    z.object({
      conversation: z.record(z.string(), z.any()).describe('Conversation details'),
      messages: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Messages in the conversation (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.getConversation(ctx.input.conversationId, {
      mailbox_id: ctx.input.mailboxId
    });

    let messages: Record<string, any>[] | undefined;
    if (ctx.input.includeMessages && ctx.input.mailboxId) {
      let messagesResult = await client.listMessages({
        mailbox_id: ctx.input.mailboxId,
        thread_id: ctx.input.conversationId
      });
      messages = Array.isArray(messagesResult)
        ? messagesResult
        : (messagesResult.messages ?? messagesResult.data ?? []);
    }

    return {
      output: { conversation, messages },
      message: `Retrieved conversation **${ctx.input.conversationId}**${messages ? ` with ${messages.length} message(s)` : ''}.`
    };
  })
  .build();
