import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationMessageSchema = z.object({
  messageId: z.string().describe('Unique message identifier.'),
  chatbotId: z.string().describe('Associated chatbot ID.'),
  visitorId: z.string().nullable().describe('Visitor identifier.'),
  entry: z.string().describe('Message content.'),
  speaker: z.string().describe('Who sent the message: "user" or "bot".'),
  status: z.string().nullable().describe('Message status (e.g. "read").'),
  feedback: z.any().nullable().describe('User feedback on the message.'),
  sources: z.array(z.any()).optional().describe('Sources used by the bot for this response.'),
  createdAt: z.string().nullable().describe('Message creation timestamp.')
});

export let getConversations = SlateTool.create(spec, {
  name: 'Get Conversations',
  key: 'get_conversations',
  description: `Retrieve conversation history for a chatbot. Can be filtered to a specific visitor's conversation, sorted, and optionally include bot response sources. Useful for reviewing visitor interactions and chatbot performance.`,
  instructions: [
    'Use the conversationId filter to retrieve messages from a specific visitor conversation thread.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.'),
      conversationId: z
        .string()
        .optional()
        .describe('Filter by a specific visitor conversation ID.'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include deleted/cleared conversations. Defaults to false.'),
      includeSources: z
        .boolean()
        .optional()
        .describe('Include source URLs the bot used for each response. Defaults to false.'),
      limit: z.number().optional().describe('Number of messages to return. Defaults to 10.'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by timestamp. Defaults to "asc".')
    })
  )
  .output(
    z.object({
      messages: z.array(conversationMessageSchema).describe('List of conversation messages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getConversations(ctx.input.chatbotId, {
      conversationId: ctx.input.conversationId,
      includeDeleted: ctx.input.includeDeleted,
      includeSources: ctx.input.includeSources,
      limit: ctx.input.limit,
      order: ctx.input.order
    });

    let messages = Array.isArray(data) ? data : [];

    let mapped = messages.map((msg: any) => ({
      messageId: msg.id?.toString() ?? '',
      chatbotId: msg.chatbot_id?.toString() ?? '',
      visitorId: msg.visitor_id?.toString() ?? null,
      entry: msg.entry ?? '',
      speaker: msg.speaker ?? '',
      status: msg.status ?? null,
      feedback: msg.feedback ?? null,
      sources: msg.sources,
      createdAt: msg.created_at ?? null
    }));

    return {
      output: {
        messages: mapped
      },
      message: `Retrieved ${mapped.length} conversation message(s).`
    };
  })
  .build();
