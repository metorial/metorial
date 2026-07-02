import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let conversationalRag = SlateTool.create(spec, {
  name: 'Conversational RAG',
  key: 'conversational_rag',
  description: `Ask questions over your uploaded documents using conversational RAG. Supports multi-turn conversations, document filtering by labels or file IDs, and configurable retrieval strategies. The system determines whether to answer from model knowledge or retrieved documents.`,
  instructions: [
    'Messages must alternate between user and assistant roles, starting with a user message.',
    'Upload documents to the library first before using this tool.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']).describe('Message role'),
            content: z.string().describe('Message content')
          })
        )
        .describe('Conversation messages, alternating user/assistant starting with user'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Filter to documents with these labels (case-sensitive)'),
      fileIds: z.array(z.string()).optional().describe('Specific file IDs to search'),
      path: z.string().optional().describe('Filter to documents matching this path prefix'),
      retrievalStrategy: z
        .enum(['segments', 'add_neighbors', 'full_doc'])
        .optional()
        .describe('Retrieval strategy for document segments'),
      maxSegments: z
        .number()
        .int()
        .optional()
        .describe('Maximum number of document segments to retrieve'),
      retrievalSimilarityThreshold: z
        .number()
        .min(0.5)
        .max(1.5)
        .optional()
        .describe('Minimum similarity threshold for segment inclusion (0.5-1.5)'),
      maxNeighbors: z
        .number()
        .int()
        .optional()
        .describe('Number of neighbor segments per candidate (with add_neighbors strategy)'),
      hybridSearchAlpha: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Balance between dense embeddings (1.0) and keyword search (0.0)')
    })
  )
  .output(
    z.object({
      ragId: z.string().describe('Unique request identifier'),
      answer: z.string().describe('Generated answer'),
      answerInContext: z.boolean().describe('Whether the answer was found in the documents'),
      contextRetrieved: z.boolean().describe('Whether the RAG engine found related segments'),
      searchQueries: z
        .array(z.string())
        .optional()
        .describe('Questions extracted from user input'),
      sources: z
        .array(
          z.object({
            fileId: z.string().describe('Source file ID'),
            fileName: z.string().describe('Source file name'),
            text: z.string().describe('Retrieved segment text'),
            score: z.number().describe('Relevance score'),
            publicUrl: z.string().optional().describe('Public URL of the source document')
          })
        )
        .optional()
        .describe('Retrieved document sources'),
      usage: z
        .object({
          promptTokens: z.number().describe('Number of prompt tokens'),
          completionTokens: z.number().describe('Number of completion tokens'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .describe('Token usage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.conversationalRag({
      messages: ctx.input.messages,
      labels: ctx.input.labels,
      fileIds: ctx.input.fileIds,
      path: ctx.input.path,
      retrievalStrategy: ctx.input.retrievalStrategy,
      maxSegments: ctx.input.maxSegments,
      retrievalSimilarityThreshold: ctx.input.retrievalSimilarityThreshold,
      maxNeighbors: ctx.input.maxNeighbors,
      hybridSearchAlpha: ctx.input.hybridSearchAlpha
    });

    let answerText = result.choices?.[0]?.message?.content ?? '';

    let sources = result.sources?.map((s: any) => ({
      fileId: s.file_id,
      fileName: s.file_name,
      text: s.text,
      score: s.score,
      publicUrl: s.public_url
    }));

    let output = {
      ragId: result.id,
      answer: answerText,
      answerInContext: result.answer_in_context ?? false,
      contextRetrieved: result.context_retrieved ?? false,
      searchQueries: result.search_queries ?? undefined,
      sources,
      usage: {
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0
      }
    };

    let sourceCount = sources?.length ?? 0;
    let preview = answerText.substring(0, 200) + (answerText.length > 200 ? '...' : '');

    return {
      output,
      message: `RAG answer generated from **${sourceCount}** source(s). Answer ${output.answerInContext ? 'was' : 'was **not**'} found in documents.\n\n> ${preview}`
    };
  })
  .build();
