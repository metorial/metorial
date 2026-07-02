import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let queryGraph = SlateTool.create(spec, {
  name: 'Query Graph',
  key: 'query_graph',
  description: `Execute a Datalog query against the Roam Research graph database. Supports the full Datomic-style Datalog syntax with \`:find\` and \`:where\` clauses.

Use this to search for blocks by content, find pages by title, traverse references, and perform aggregations across the graph.

Queries can be parameterized via \`args\` for safe variable injection.`,
  instructions: [
    'Queries must use Datomic-style Datalog syntax with :find and :where clauses.',
    'Use args for parameterized queries instead of string interpolation.',
    'Common attributes: :node/title (page titles), :block/string (block content), :block/uid (block UID), :block/refs (references), :block/children (child blocks), :block/parents (ancestor blocks), :block/page (parent page), :block/order (position).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Datalog query string, e.g. [:find ?title :where [?e :node/title ?title]]'),
      args: z
        .array(z.unknown())
        .optional()
        .describe('Optional query arguments for parameterized queries')
    })
  )
  .output(
    z.object({
      results: z.unknown().describe('Query results as returned by the Roam API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let results = await client.query(ctx.input.query, ctx.input.args);

    return {
      output: { results },
      message: `Query executed successfully. Returned results from graph **${ctx.config.graphName}**.`
    };
  })
  .build();
