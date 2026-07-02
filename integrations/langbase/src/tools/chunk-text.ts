import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let chunkText = SlateTool.create(spec, {
  name: 'Chunk Text',
  key: 'chunk_text',
  description: `Split text into smaller, manageable chunks. Useful for RAG pipelines, processing long documents, or working with specific sections of content. Uses intelligent text splitting with configurable chunk size and overlap.`,
  constraints: [
    'Chunk max length must be between 1,024 and 30,000 characters.',
    'Chunk overlap must be at least 256 characters and less than the chunk max length.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Text content to split into chunks'),
      chunkMaxLength: z
        .number()
        .optional()
        .describe('Maximum length of each chunk (1024-30000, defaults to 1024)'),
      chunkOverlap: z
        .number()
        .optional()
        .describe('Number of overlapping characters between chunks (min 256)')
    })
  )
  .output(
    z.object({
      chunks: z.array(z.string()).describe('Array of text chunks'),
      chunkCount: z.number().describe('Total number of chunks produced')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      content: ctx.input.content
    };

    if (ctx.input.chunkMaxLength !== undefined) body.chunkMaxLength = ctx.input.chunkMaxLength;
    if (ctx.input.chunkOverlap !== undefined) body.chunkOverlap = ctx.input.chunkOverlap;

    let result = await client.chunkText(body);
    let chunks = Array.isArray(result) ? result : [];

    return {
      output: {
        chunks,
        chunkCount: chunks.length
      },
      message: `Split text into **${chunks.length}** chunk(s).`
    };
  })
  .build();
