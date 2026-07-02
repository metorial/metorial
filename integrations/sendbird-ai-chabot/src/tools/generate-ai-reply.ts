import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAiReply = SlateTool.create(spec, {
  name: 'Generate AI Reply',
  key: 'generate_ai_reply',
  description: `Generates an AI chatbot reply based on a conversation history. Provide an array of messages with roles ("user" or "assistant") and the bot will generate a contextual response using its configured AI backend.`,
  instructions: [
    'Messages should alternate between "user" and "assistant" roles for best results.',
    'The last message should typically be from the "user" role.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the AI chatbot to generate the reply'),
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
            content: z.string().describe('Text content of the message')
          })
        )
        .min(1)
        .describe('Conversation history to generate a reply from'),
      useStreamingResponse: z
        .boolean()
        .optional()
        .describe('Whether to use streaming response mode')
    })
  )
  .output(
    z.object({
      replyMessages: z
        .array(
          z.object({
            role: z.string().optional().describe('Role of the reply sender'),
            content: z.string().optional().describe('Text content of the reply')
          })
        )
        .describe('Generated reply messages from the AI chatbot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    let result = await client.generateAiReply(
      ctx.input.botUserId,
      ctx.input.messages,
      ctx.input.useStreamingResponse
    );

    let replies = (result.reply_messages || []).map((r: Record<string, unknown>) => ({
      role: r.role as string | undefined,
      content: (r.content ?? r.message) as string | undefined
    }));

    return {
      output: {
        replyMessages: replies
      },
      message: `Generated **${replies.length}** AI reply message(s) from bot **${ctx.input.botUserId}**.`
    };
  })
  .build();
