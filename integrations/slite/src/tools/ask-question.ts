import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let askQuestion = SlateTool.create(spec, {
  name: 'Ask Question',
  key: 'ask_question',
  description: `Ask a natural language question to Slite's AI-powered knowledge base. The AI searches across all accessible notes and returns an answer with source references. Results can be scoped to a specific parent note or assistant. The question can create a retained thread; a processing result is not a completed answer. Read the same thread rather than resubmitting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      question: z.string().describe('Natural language question to ask'),
      parentNoteId: z
        .string()
        .optional()
        .describe('Restrict AI search to notes under this parent note'),
      assistantId: z
        .string()
        .optional()
        .describe('Use a specific AI assistant (requires super tier)')
    })
  )
  .output(
    z.object({
      status: z.enum(['completed', 'processing']),
      threadId: z.string().optional(),
      retryAfterSeconds: z.number().optional(),
      answer: z.string().describe('AI-generated answer to the question'),
      sources: z
        .array(
          z.object({
            noteId: z.string().describe('ID of the source note'),
            title: z.string().describe('Title of the source note'),
            url: z.string().describe('URL to the source note'),
            updatedAt: z.string().optional().describe('Last update of the source'),
            explanation: z
              .string()
              .optional()
              .describe('Why this source was relevant (super tier only)')
          })
        )
        .describe('Notes used to generate the answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.ask({
      question: ctx.input.question,
      parentNoteId: ctx.input.parentNoteId,
      assistantId: ctx.input.assistantId
    });

    let sources = result.sources.map(source => ({
      noteId: source.id,
      title: source.title,
      url: source.url,
      updatedAt: source.updatedAt,
      explanation: source.explanation
    }));

    return {
      output: {
        status: result.status,
        threadId: 'threadId' in result ? result.threadId : undefined,
        retryAfterSeconds:
          'retryAfterSeconds' in result ? result.retryAfterSeconds : undefined,
        answer: result.answer,
        sources
      },
      message:
        result.status === 'processing'
          ? `The question is still processing. Save threadId ${'threadId' in result ? result.threadId : ''} and inspect it with get_ask_thread; do not submit the question again implicitly.`
          : `**Answer:** ${result.answer}\n\nBased on ${sources.length} source(s).`
    };
  })
  .build();
