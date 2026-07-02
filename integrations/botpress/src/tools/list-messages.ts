import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let listMessagesTool = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List messages in a bot's conversations. Optionally filter by conversation ID. Returns message content, sender, timestamps, and direction (incoming/outgoing).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      conversationId: z
        .string()
        .optional()
        .describe('Filter messages to a specific conversation'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string(),
          conversationId: z.string(),
          userId: z.string().optional(),
          messageType: z.string().optional(),
          payload: z.record(z.string(), z.unknown()).optional(),
          direction: z.string().optional(),
          createdAt: z.string()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new RuntimeClient({ token: ctx.auth.token, botId });

    let result = await client.listMessages({
      conversationId: ctx.input.conversationId,
      nextToken: ctx.input.nextToken
    });

    let messages = (result.messages || []).map((m: Record<string, unknown>) => ({
      messageId: m.id as string,
      conversationId: m.conversationId as string,
      userId: m.userId as string | undefined,
      messageType: m.type as string | undefined,
      payload: m.payload as Record<string, unknown> | undefined,
      direction: m.direction as string | undefined,
      createdAt: m.createdAt as string
    }));

    return {
      output: {
        messages,
        nextToken: result.meta?.nextToken
      },
      message: `Found **${messages.length}** message(s).${ctx.input.conversationId ? ` In conversation **${ctx.input.conversationId}**.` : ''}`
    };
  })
  .build();
