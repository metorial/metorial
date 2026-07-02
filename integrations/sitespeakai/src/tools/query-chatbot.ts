import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryChatbot = SlateTool.create(spec, {
  name: 'Query Chatbot',
  key: 'query_chatbot',
  description: `Send a question to a trained SiteSpeakAI chatbot and receive an AI-generated answer along with the source URLs used to formulate the response. Supports grouping messages into conversations and choosing response format.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z
        .string()
        .describe('The ID of the chatbot to query. Found on the chatbot settings page.'),
      prompt: z.string().describe('The question or query text to send to the chatbot.'),
      conversationId: z
        .string()
        .optional()
        .describe(
          'Optional conversation ID to group related questions and answers into a single conversation thread.'
        ),
      format: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Response format. Defaults to markdown.')
    })
  )
  .output(
    z.object({
      text: z.string().describe('The chatbot answer text.'),
      urls: z.array(z.string()).describe('Source URLs used to formulate the response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.queryChatbot(ctx.input.chatbotId, {
      prompt: ctx.input.prompt,
      conversationId: ctx.input.conversationId,
      format: ctx.input.format
    });

    return {
      output: {
        text: result.text ?? '',
        urls: result.urls ?? []
      },
      message: `Chatbot responded with an answer using ${(result.urls ?? []).length} source(s).`
    };
  })
  .build();
