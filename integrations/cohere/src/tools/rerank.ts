import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

export let rerankTool = SlateTool.create(spec, {
  name: 'Rerank Documents',
  key: 'rerank_documents',
  description: `Rerank a list of documents by semantic relevance to a query using Cohere's Rerank models. Useful for improving search quality by re-ordering results from any existing search system based on meaning rather than keyword matching.`,
  instructions: [
    'Provide a search query and a list of document texts. The model will score and rank each document by relevance.',
    'Use "topN" to limit results to only the most relevant documents.'
  ],
  constraints: [
    'Documents longer than 510 tokens are automatically chunked.',
    'Recommended maximum of ~1,000 documents per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Rerank model to use (e.g., "rerank-v3.5", "rerank-english-v3.0", "rerank-multilingual-v3.0")'
        ),
      query: z.string().describe('The search query to rank documents against'),
      documents: z.array(z.string()).min(1).describe('List of document texts to rerank'),
      topN: z.number().optional().describe('Only return the top N most relevant documents'),
      maxTokensPerDoc: z
        .number()
        .optional()
        .describe('Maximum tokens per document before truncation (default: 4096)')
    })
  )
  .output(
    z.object({
      rerankId: z.string().describe('Unique identifier for this rerank response'),
      results: z
        .array(
          z.object({
            index: z.number().describe('Original index of the document in the input array'),
            relevanceScore: z.number().describe('Relevance score between 0 and 1'),
            document: z.string().describe('The document text')
          })
        )
        .describe('Documents ranked by relevance score (highest first)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.rerank({
      model: ctx.input.model,
      query: ctx.input.query,
      documents: ctx.input.documents,
      topN: ctx.input.topN,
      maxTokensPerDoc: ctx.input.maxTokensPerDoc
    });

    let results = (result.results || []).map((r: any) => ({
      index: r.index,
      relevanceScore: r.relevance_score,
      document: ctx.input.documents[r.index] || ''
    }));

    return {
      output: {
        rerankId: result.id || '',
        results
      },
      message: `Reranked **${ctx.input.documents.length}** documents for query "${ctx.input.query}". Top result score: **${results[0]?.relevanceScore?.toFixed(4) || 'N/A'}**.`
    };
  })
  .build();
