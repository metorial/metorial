import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runQuery = SlateTool.create(spec, {
  name: 'Run Query',
  key: 'run_query',
  description: `Run a natural language query against a DocSet using Aryn's Deep Analytics engine. The query engine combines GenAI reasoning with database and LLM-based operators to analyze documents.

Supports both RAG-mode queries (retrieval-augmented generation) and full deep analytics queries with multi-step execution plans.`,
  instructions: [
    'Set ragMode to true for simple retrieval-augmented generation queries.',
    'Set summarizeResult to true to get a plain-English summary of the results.',
    'For complex analytics, leave ragMode false to use the full Deep Analytics engine.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to query'),
      query: z.string().describe('Natural language query to run'),
      ragMode: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use RAG-only mode for retrieval-augmented generation'),
      summarizeResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include a plain-English summary of results')
    })
  )
  .output(
    z.object({
      queryResult: z.any().describe('Query execution result with data and optional summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.info(`Running query on DocSet ${ctx.input.docsetId}`);

    let result = await client.runQuery({
      docsetId: ctx.input.docsetId,
      query: ctx.input.query,
      ragMode: ctx.input.ragMode,
      summarizeResult: ctx.input.summarizeResult
    });

    return {
      output: { queryResult: result },
      message: `Query executed on DocSet \`${ctx.input.docsetId}\`: "${ctx.input.query}"`
    };
  })
  .build();

export let generateQueryPlan = SlateTool.create(spec, {
  name: 'Generate Query Plan',
  key: 'generate_query_plan',
  description: `Generate an execution plan for a natural language query without running it. Returns the logical plan that shows what operations would be performed, allowing inspection and modification before execution.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to plan the query against'),
      query: z.string().describe('Natural language query to plan')
    })
  )
  .output(
    z.object({
      plan: z.any().describe('Logical query plan with nodes and execution steps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.generatePlan({
      docsetId: ctx.input.docsetId,
      query: ctx.input.query
    });

    return {
      output: { plan: result },
      message: `Generated query plan for: "${ctx.input.query}"`
    };
  })
  .build();
