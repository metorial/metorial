import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateEmbedding = SlateTool.create(spec, {
  name: 'Generate Embedding',
  key: 'generate_embedding',
  description: `Generate vector embeddings for text, images, audio, or PDFs. Useful for semantic search, clustering, similarity comparison, and other vector-based operations. Provide the content and specify the type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().optional().describe('Text content to generate embeddings for'),
      url: z.string().optional().describe('URL of an image or audio file'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded file'),
      type: z
        .enum(['text', 'text-other', 'image', 'audio', 'pdf'])
        .describe('Content type being embedded'),
      tokenOverflowMode: z
        .enum(['error', 'truncate'])
        .optional()
        .describe('Behavior when exceeding token limits (default: "error")')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      embeddings: z
        .array(z.array(z.number()))
        .describe('Vector embeddings as nested arrays of floats'),
      chunks: z
        .array(z.unknown())
        .optional()
        .describe('Text segments used for embedding (text/audio only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateEmbedding({
      text: ctx.input.text,
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      type: ctx.input.type,
      tokenOverflowMode: ctx.input.tokenOverflowMode
    });

    let dimensions = result.embeddings?.[0]?.length ?? 0;

    return {
      output: {
        success: result.success,
        embeddings: result.embeddings,
        chunks: result.chunks
      },
      message: `Generated **${result.embeddings?.length ?? 0} embedding(s)** with ${dimensions} dimensions for ${ctx.input.type} content.`
    };
  })
  .build();
