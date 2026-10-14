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
    'Aryn requires streaming for summaries. Use generate_query_plan followed by execute_query_plan with summarizeResult true when a summary is needed.',
    'For complex analytics, leave ragMode false to use the full Deep Analytics engine.'
  ],
  constraints: [
    'This tool returns the original query result; the provider does not supply summaries for nonstreaming queries.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z
        .string()
        .describe('ID of the DocSet to query. Call list_docsets to discover DocSet IDs.'),
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
        .describe(
          'Request a plain-English summary. Aryn currently supplies summaries only through execute_query_plan.'
        )
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
      docsetId: z
        .string()
        .describe(
          'ID of the DocSet to plan the query against. Call list_docsets to discover DocSet IDs.'
        ),
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

export let executeQueryPlan = SlateTool.create(spec, {
  name: 'Execute Query Plan',
  key: 'execute_query_plan',
  description:
    'Execute a logical plan returned by generate_query_plan against a DocSet. This allows an inspected or modified plan to be run without generating a new one.',
  constraints: [
    'With summaries enabled, scalar results are returned as text and all query events are included.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      docsetId: z.string().describe('DocSet ID. Call list_docsets to discover DocSets.'),
      plan: z
        .object({
          query: z.string().describe('Original natural language query for this plan'),
          nodes: z
            .record(
              z.string(),
              z
                .object({
                  node_id: z.number().describe('Unique whole-number node ID'),
                  node_type: z.string().nullable().optional().describe('Query operator type'),
                  description: z
                    .string()
                    .nullable()
                    .optional()
                    .describe('Purpose of the operator'),
                  inputs: z.array(z.number()).optional().describe('Input node IDs')
                })
                .passthrough()
            )
            .describe('Mapping of node IDs to query operators'),
          result_node: z.number().describe('ID of the node that produces the result'),
          llm_prompt: z.any().optional().describe('Optional original planner prompt'),
          llm_plan: z
            .string()
            .nullable()
            .optional()
            .describe('Optional original planner response')
        })
        .describe('Logical plan returned by generate_query_plan'),
      summarizeResult: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include a plain-English summary of results')
    })
  )
  .output(
    z.object({
      queryResult: z.any().describe('Execution result with data and optional summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let queryResult = await client.executeQueryPlan({
      docsetId: ctx.input.docsetId,
      plan: ctx.input.plan,
      summarizeResult: ctx.input.summarizeResult
    });
    return {
      output: { queryResult },
      message: `Executed the query plan on DocSet \`${ctx.input.docsetId}\`.`
    };
  })
  .build();
