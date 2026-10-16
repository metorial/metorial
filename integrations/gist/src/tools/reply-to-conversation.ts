import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let replyToConversation = SlateTool.create(spec, {
  name: 'Reply to Conversation',
  key: 'reply_to_conversation',
  description: `Send a reply or add an internal note to a Gist conversation. Replies are visible to the contact; notes are visible only to teammates.`
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to reply to'),
      body: z.string().describe('Message text'),
      teammateId: z
        .string()
        .optional()
        .describe(
          'Authoring teammate ID. Call list_teams to discover teammates. Omit to reply as a bot.'
        ),
      isNote: z
        .boolean()
        .optional()
        .describe('If true, adds as an internal note instead of a reply')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      messageId: z.string().describe('ID of the sent message'),
      body: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      body: ctx.input.body,
      message_type: ctx.input.isNote ? 'note' : 'reply',
      from: ctx.input.teammateId
        ? { type: 'teammate', teammate_id: ctx.input.teammateId }
        : { type: 'bot' }
    };

    let data = await client.replyToConversation(ctx.input.conversationId, payload);
    let msg = data.message || data;

    return {
      output: {
        rawResponse: client.responses,
        messageId: requiredId(msg.id),
        body: msg.body,
        createdAt: msg.created_at !== undefined ? String(msg.created_at) : undefined
      },
      message: ctx.input.isNote
        ? `Added an internal note to conversation **${ctx.input.conversationId}**.`
        : `Replied to conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
