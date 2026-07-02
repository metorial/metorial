import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let runQuery = SlateTool.create(spec, {
  name: 'Run Query',
  key: 'run_query',
  description: `Execute a Convex query function over HTTP. Queries are read-only functions that fetch data from the Convex database.
Specify the function path (e.g. \`messages:list\` or \`users:getById\`) and optional arguments.
Returns the query result as JSON.`,
  instructions: [
    'Function paths use the format "module:functionName" (e.g. "messages:list", "users:getById")',
    "Arguments must match the function's expected parameter types"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      functionPath: z.string().describe('Path to the query function (e.g. "messages:list")'),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments to pass to the query function')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The query result returned by the function'),
      status: z.string().describe('Status of the query execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Executing query...');
    let result = await client.query(ctx.input.functionPath, ctx.input.args || {});

    return {
      output: {
        result: result.value !== undefined ? result.value : result,
        status: result.status || 'success'
      },
      message: `Query **${ctx.input.functionPath}** executed successfully.`
    };
  })
  .build();
