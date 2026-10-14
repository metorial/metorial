import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateEmbeddingV2 = SlateTool.create(spec, {
  name: 'Generate Embedding v2',
  key: 'generate_embedding_v2',
  description: `Generate configurable vector embeddings with the current embedding v2 API for text, images, audio, or PDFs. Supports query instructions and speaker fingerprints. Useful for semantic search, clustering, similarity comparison, and other vector-based operations. Provide the content and specify the type.`,
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
        .describe('Behavior when exceeding token limits (default: "error")'),
      dimensions: z
        .number()
        .min(32)
        .max(4096)
        .optional()
        .describe('Vector dimensions (32-4096, default 4096)'),
      instruction: z
        .string()
        .max(400)
        .optional()
        .describe('Retrieval instruction for text query embeddings'),
      query: z.boolean().optional().describe('Generate a query embedding for text content'),
      speakerFingerprint: z
        .boolean()
        .optional()
        .describe('Include speaker embeddings for audio content')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional result details'),
      embeddings: z
        .array(z.array(z.number()))
        .describe('Vector embeddings as nested arrays of floats'),
      speakerEmbeddings: z
        .array(z.array(z.number()))
        .optional()
        .describe('Speaker audio embeddings when requested'),
      chunks: z
        .array(z.unknown())
        .optional()
        .describe('Text segments used for embedding (text/audio only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateEmbeddingV2({
      text: ctx.input.text,
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      type: ctx.input.type,
      tokenOverflowMode: ctx.input.tokenOverflowMode,
      dimensions: ctx.input.dimensions,
      instruction: ctx.input.instruction,
      query: ctx.input.query,
      speakerFingerprint: ctx.input.speakerFingerprint
    });

    let dimensions = result.embeddings?.[0]?.length ?? 0;

    return {
      output: {
        success: result.success,
        rawResponse: result,
        embeddings: result.embeddings,
        chunks: result.chunks,
        speakerEmbeddings: result.speaker_embeddings
      },
      message: `Generated **${result.embeddings?.length ?? 0} embedding(s)** with ${dimensions} dimensions for ${ctx.input.type} content.`
    };
  })
  .build();
