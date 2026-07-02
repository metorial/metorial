import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let rerankTool = SlateTool.create(spec, {
  name: 'Rerank',
  key: 'rerank',
  description: `Rerank a list of documents by relevance to a query using Pinecone's hosted reranking models (e.g. \`bge-reranker-v2-m3\`). Returns documents sorted by relevance score. Use after an initial retrieval step to improve search quality.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Reranking model name (e.g. bge-reranker-v2-m3)'),
      query: z.string().describe('Query text to rank documents against'),
      documents: z
        .array(z.record(z.string(), z.any()))
        .min(1)
        .describe('Documents to rerank, each with a text field'),
      topN: z
        .number()
        .int()
        .optional()
        .describe('Number of top results to return (defaults to all)'),
      returnDocuments: z
        .boolean()
        .optional()
        .describe('Include document content in results (default true)'),
      rankFields: z
        .array(z.string())
        .optional()
        .describe('Document fields to consider for ranking (default: ["text"])')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Reranking model used'),
      rankedResults: z
        .array(
          z.object({
            originalIndex: z
              .number()
              .describe('Original index of the document in the input array'),
            relevanceScore: z.number().describe('Relevance score from 0 to 1'),
            document: z
              .record(z.string(), z.any())
              .optional()
              .describe('Document content if returnDocuments was true')
          })
        )
        .describe('Documents ranked by relevance'),
      rerankUnits: z.number().describe('Rerank units consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeControlPlaneClient({ token: ctx.auth.token });

    let result = await client.rerank({
      model: ctx.input.model,
      query: ctx.input.query,
      documents: ctx.input.documents,
      top_n: ctx.input.topN,
      return_documents: ctx.input.returnDocuments,
      rank_fields: ctx.input.rankFields
    });

    let rankedResults = (result.data || []).map(d => ({
      originalIndex: d.index,
      relevanceScore: d.score,
      document: d.document
    }));

    return {
      output: {
        model: result.model,
        rankedResults,
        rerankUnits: result.usage.rerank_units
      },
      message: `Reranked **${rankedResults.length}** document${rankedResults.length === 1 ? '' : 's'}${rankedResults.length > 0 && rankedResults[0] ? ` (top score: ${rankedResults[0].relevanceScore.toFixed(4)})` : ''}.`
    };
  })
  .build();
