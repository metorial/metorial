import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { spec } from '../spec';

export let queryKnowledgeGraph = SlateTool.create(spec, {
  name: 'Query Knowledge Graph',
  key: 'query_knowledge_graph',
  description: `Ask a question to one or more Knowledge Graphs and get an AI-generated answer grounded in your uploaded data. Returns the answer, source references, and optional inline citations. Supports subquery decomposition for complex questions.`,
  instructions: [
    'Provide at least one Knowledge Graph ID. You can query multiple graphs simultaneously.',
    'Enable subqueries to break complex questions into smaller, more targeted queries.',
    'Use inline citations to get source attribution embedded in the answer text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      graphIds: z.array(z.string()).min(1).describe('IDs of the Knowledge Graphs to query'),
      question: z.string().describe('Question to ask the Knowledge Graphs'),
      subqueries: z
        .boolean()
        .optional()
        .describe('Break complex questions into sub-questions for more comprehensive answers'),
      queryConfig: z
        .object({
          maxSubquestions: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .describe('Maximum number of sub-questions (1-10, default: 6)'),
          searchWeight: z
            .number()
            .min(0)
            .max(100)
            .optional()
            .describe('Balance between keyword and semantic search (0-100, default: 50)'),
          groundingLevel: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Fidelity to source material vs creative response (0-1, default: 0)'),
          maxSnippets: z
            .number()
            .min(1)
            .max(60)
            .optional()
            .describe('Maximum context snippets to retrieve (1-60, default: 30)'),
          maxTokens: z
            .number()
            .min(100)
            .max(8000)
            .optional()
            .describe('Maximum tokens in the response (100-8000, default: 4000)'),
          inlineCitations: z
            .boolean()
            .optional()
            .describe('Embed source citations within the answer text'),
          keywordThreshold: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Keyword matching threshold (0-1, default: 0.7)'),
          semanticThreshold: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Semantic matching threshold (0-1, default: 0.7)')
        })
        .optional()
        .describe('Advanced query configuration options')
    })
  )
  .output(
    z.object({
      question: z.string().describe('The question that was asked'),
      answer: z.string().describe('AI-generated answer grounded in the Knowledge Graph data'),
      sources: z
        .array(
          z.object({
            fileId: z.string().describe('ID of the source file'),
            snippets: z.array(z.string()).describe('Relevant text snippets from the file')
          })
        )
        .describe('Source files and snippets used to generate the answer'),
      subqueries: z
        .array(
          z.object({
            question: z.string().describe('Sub-question'),
            answer: z.string().describe('Answer to the sub-question')
          })
        )
        .optional()
        .describe('Decomposed sub-questions and their answers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Querying Knowledge Graph...');
    let result = await client.queryGraph({
      graphIds: ctx.input.graphIds,
      question: ctx.input.question,
      subqueries: ctx.input.subqueries,
      queryConfig: ctx.input.queryConfig
    });

    let sourceCount = result.sources.length;
    let preview =
      result.answer.length > 300 ? `${result.answer.substring(0, 300)}...` : result.answer;

    return {
      output: result,
      message: `Answered from **${sourceCount}** source(s)${result.subqueries ? ` with **${result.subqueries.length}** sub-queries` : ''}.\n\n> ${preview}`
    };
  })
  .build();
