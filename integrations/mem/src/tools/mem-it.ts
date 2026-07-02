import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let memIt = SlateTool.create(spec, {
  name: 'Mem It',
  key: 'mem_it',
  description: `Use Mem's AI to process raw content and intelligently save it to your knowledge base. Accepts any content such as web pages, emails, transcripts, articles, or plain text. You can provide instructions on how the content should be processed and context about how it relates to existing knowledge. This is an asynchronous operation — the content will be processed in the background.`,
  constraints: [
    'Input content can be up to ~1,000,000 characters.',
    'This endpoint costs 40 complexity tokens per call (vs. 1 for other endpoints).',
    'Processing is asynchronous — only a request ID is returned immediately.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe(
          'Raw content to process — web pages, emails, transcripts, articles, or plain text.'
        ),
      instructions: z
        .string()
        .optional()
        .describe(
          'Guidance on how the content should be processed (e.g. "Extract key findings and save as a research note").'
        ),
      context: z
        .string()
        .optional()
        .describe(
          'Background information to help Mem understand how the input relates to existing knowledge (e.g. "This is related to my Project Alpha research").'
        ),
      timestamp: z
        .string()
        .optional()
        .describe('When the information was originally encountered, in ISO 8601 format.')
    })
  )
  .output(
    z.object({
      requestId: z
        .string()
        .describe('The request ID for tracking the asynchronous processing.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let response = await client.memIt({
      input: ctx.input.content,
      instructions: ctx.input.instructions,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp
    });

    return {
      output: {
        requestId: response.request_id
      },
      message: `Content submitted for AI processing (request: \`${response.request_id}\`). Processing will happen in the background.`
    };
  })
  .build();
