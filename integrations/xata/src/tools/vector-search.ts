import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let vectorSearch = SlateTool.create(spec, {
  name: 'Vector Search',
  key: 'vector_search',
  description: `Perform vector-based similarity search on a table column that contains vector embeddings. Use this for semantic search, recommendation systems, or any nearest-neighbor lookup. Requires a column of type "vector" with a fixed dimension.`,
  instructions: [
    'The queryVector must match the dimension of the target vector column.',
    'Supported similarity functions: "cosineSimilarity" (default), "l1", "l2".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().optional().describe('Branch name (defaults to config branch)'),
      tableName: z.string().describe('Name of the table containing vector data'),
      column: z.string().describe('Name of the vector column to search'),
      queryVector: z
        .array(z.number())
        .describe('Query vector (must match the column dimension)'),
      similarityFunction: z
        .enum(['cosineSimilarity', 'l1', 'l2'])
        .optional()
        .describe('Similarity function to use (default: cosineSimilarity)'),
      size: z.number().optional().describe('Number of results to return (default: 10)'),
      filter: z.any().optional().describe('Filter object to narrow the search scope')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            record: z.any().describe('The matching record'),
            score: z.number().optional().describe('Similarity score')
          })
        )
        .describe('Records ranked by vector similarity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let branch = ctx.input.branch || ctx.config.branch;

    let result = await client.vectorSearch(
      ctx.input.databaseName,
      branch,
      ctx.input.tableName,
      {
        queryVector: ctx.input.queryVector,
        column: ctx.input.column,
        similarityFunction: ctx.input.similarityFunction,
        size: ctx.input.size,
        filter: ctx.input.filter
      }
    );

    let results = (result.records || []).map((r: any) => ({
      record: r,
      score: r.xata?.score
    }));

    return {
      output: { results },
      message: `Found **${results.length}** similar record(s) in **${ctx.input.tableName}** using column **${ctx.input.column}**.`
    };
  })
  .build();
