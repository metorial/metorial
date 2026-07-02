import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let askAiAgent = SlateTool.create(spec, {
  name: 'Ask AI Agent',
  key: 'ask_ai_agent',
  description: `Ask questions to Token Metrics' AI chatbot in plain English and receive crypto market insights, token analyses, or instant dashboards on demand. Supports conversational interaction with message history for follow-up questions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      question: z.string().describe('The question to ask the AI agent in plain English'),
      previousMessages: z
        .array(z.string())
        .optional()
        .describe('Previous questions in the conversation for context')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('The AI agent response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let messages: Array<{ user: string }> = [];
    if (ctx.input.previousMessages) {
      for (let msg of ctx.input.previousMessages) {
        messages.push({ user: msg });
      }
    }
    messages.push({ user: ctx.input.question });

    let result = await client.askAiAgent(messages);
    let answer = result?.answer ?? result?.data?.answer ?? '';

    return {
      output: { answer },
      message: `AI Agent responded to: "${ctx.input.question}"`
    };
  })
  .build();
