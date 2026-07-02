import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve full details of a conversation session including the complete message history, summary, sentiment, resolution/escalation status, and user metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID the conversation belongs to'),
      conversationId: z.string().describe('Conversation ID to retrieve')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation identifier'),
      title: z.string().optional().describe('Conversation title'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp'),
      model: z.string().optional().describe('AI model used'),
      answered: z.boolean().optional().describe('Whether the bot answered'),
      summary: z.string().optional().describe('Auto-generated summary'),
      sentiment: z.string().optional().describe('Sentiment: positive, negative, neutral'),
      resolved: z.string().optional().describe('Resolution status'),
      escalated: z.string().optional().describe('Escalation status'),
      alias: z.string().optional().describe('Anonymous username'),
      ticketSubject: z.string().optional().describe('Support ticket subject if escalated'),
      ticketContent: z.string().optional().describe('Support ticket body if escalated'),
      metadata: z.record(z.string(), z.any()).optional().describe('User metadata'),
      messages: z
        .array(
          z.object({
            timestamp: z.string().describe('ISO 8601 message timestamp'),
            humanMessage: z.string().optional().describe('User message content'),
            aiMessage: z.string().optional().describe('Bot response content'),
            messageType: z
              .string()
              .optional()
              .describe(
                'Event type (answer, lookup_answer, is_resolved_question, support_escalation)'
              ),
            answerId: z.string().optional().describe('Answer ID for rating/escalation')
          })
        )
        .describe('Full message history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let conv = await client.getConversation(
      ctx.config.teamId,
      ctx.input.botId,
      ctx.input.conversationId
    );

    let messages = (conv.history ?? []).map(m => ({
      timestamp: m.timestamp,
      humanMessage: m.Human ?? undefined,
      aiMessage: m.AI ?? undefined,
      messageType: m.type ?? undefined,
      answerId: m.id ?? undefined
    }));

    return {
      output: {
        conversationId: conv.id,
        title: conv.title ?? undefined,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        model: conv.model ?? undefined,
        answered: conv.answered,
        summary: conv.summary ?? undefined,
        sentiment: conv.sentiment ?? undefined,
        resolved: conv.resolved,
        escalated: conv.escalated,
        alias: conv.alias,
        ticketSubject: conv.ticketSubject ?? undefined,
        ticketContent: conv.ticketContent ?? undefined,
        metadata: conv.metadata,
        messages
      },
      message: `Conversation **${conv.title ?? conv.id}**: ${messages.length} messages, sentiment: ${conv.sentiment ?? 'unknown'}, resolved: ${conv.resolved ?? 'unknown'}`
    };
  })
  .build();
