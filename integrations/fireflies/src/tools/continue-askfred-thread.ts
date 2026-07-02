import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let continueAskFredThread = SlateTool.create(spec, {
  name: 'Continue AskFred Thread',
  key: 'continue_askfred_thread',
  description: `Ask a follow-up question in an existing AskFred conversation thread. Maintains context from previous messages in the thread to provide more relevant answers.`,
  constraints: [
    'Requires active AI credits on the account.',
    'Query limited to 2000 characters.'
  ]
})
  .input(
    z.object({
      threadId: z.string().describe('The ID of the existing AskFred thread to continue'),
      query: z.string().describe('Follow-up question (max 2000 characters)'),
      responseLanguage: z.string().optional().describe('Language code for the response'),
      formatMode: z.enum(['markdown', 'plaintext']).optional().describe('Response format mode')
    })
  )
  .output(
    z.object({
      messageId: z.string().nullable().describe('Message identifier'),
      threadId: z.string().nullable().describe('Thread identifier'),
      answer: z.string().nullable().describe('AI-generated answer'),
      suggestedQueries: z
        .array(z.string())
        .nullable()
        .describe('Suggested follow-up questions'),
      status: z.string().nullable().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.query.trim()) {
      throw firefliesServiceError('query is required.');
    }
    if (ctx.input.query.length > 2000) {
      throw firefliesServiceError('query must be 2000 characters or fewer.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.continueAskFredThread({
      threadId: ctx.input.threadId,
      query: ctx.input.query,
      responseLanguage: ctx.input.responseLanguage,
      formatMode: ctx.input.formatMode
    });

    let message = result?.message;

    return {
      output: {
        messageId: message?.id ?? null,
        threadId: message?.thread_id ?? null,
        answer: message?.answer ?? null,
        suggestedQueries: message?.suggested_queries ?? null,
        status: message?.status ?? null
      },
      message: message?.answer
        ? `**AskFred response:**\n\n${message.answer}`
        : 'AskFred did not return an answer.'
    };
  })
  .build();
