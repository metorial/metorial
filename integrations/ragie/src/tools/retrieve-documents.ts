import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retrieveDocuments = SlateTool.create(spec, {
  name: 'Retrieve Documents',
  key: 'retrieve_documents',
  description: `Perform semantic search across indexed documents using a natural language query. Returns relevant text chunks suitable for use as LLM context.
Supports metadata filtering, reranking for relevance, and limiting chunks per document for diversity.`,
  instructions: [
    'Enable rerank to filter out semantically similar but irrelevant results (increases latency).',
    'Use maxChunksPerDocument with the summary index to get diverse results across multiple documents.',
    'Metadata filters act as pre-filters and support operators like $eq, $in, $gt, $lt, etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language search query'),
      topK: z
        .number()
        .optional()
        .describe(
          'Maximum number of chunks to return. Higher values return more results but increase latency.'
        ),
      rerank: z
        .boolean()
        .optional()
        .describe('Enable relevance reranking to filter out irrelevant results'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Metadata filter using comparison operators ($eq, $ne, $gt, $gte, $lt, $lte, $in, $nin) and logical operators ($and, $or)'
        ),
      maxChunksPerDocument: z
        .number()
        .optional()
        .describe('Maximum chunks per document for result diversity'),
      partition: z
        .string()
        .optional()
        .describe('Partition to scope retrieval to. Overrides default partition from config.')
    })
  )
  .output(
    z.object({
      chunks: z
        .array(
          z.object({
            chunkId: z.string().describe('Chunk ID'),
            text: z.string().describe('Chunk text content'),
            score: z
              .number()
              .describe('Relevance score (relative, not comparable across queries)'),
            chunkIndex: z.number().describe('Position index within the document'),
            metadata: z
              .record(z.string(), z.any())
              .describe('Chunk-level metadata (e.g., page numbers, timestamps)'),
            documentMetadata: z
              .record(z.string(), z.any())
              .describe('Parent document metadata')
          })
        )
        .describe('Scored and ranked chunks matching the query'),
      totalChunks: z.number().describe('Number of chunks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let result = await client.retrieve({
      query: ctx.input.query,
      topK: ctx.input.topK,
      rerank: ctx.input.rerank,
      filter: ctx.input.filter,
      maxChunksPerDocument: ctx.input.maxChunksPerDocument,
      partition: ctx.input.partition
    });

    let chunks = result.scoredChunks.map(c => ({
      chunkId: c.id,
      text: c.text,
      score: c.score,
      chunkIndex: c.index,
      metadata: c.metadata,
      documentMetadata: c.documentMetadata
    }));

    return {
      output: {
        chunks,
        totalChunks: chunks.length
      },
      message: `Retrieved **${chunks.length}** chunks for query: "${ctx.input.query}"${ctx.input.rerank ? ' (reranked)' : ''}`
    };
  })
  .build();
