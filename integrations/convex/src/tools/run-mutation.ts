import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let runMutation = SlateTool.create(spec, {
  name: 'Run Mutation',
  key: 'run_mutation',
  description: `Execute a Convex mutation function over HTTP. Mutations are write operations that can read and modify data in the Convex database with ACID transaction guarantees.
Specify the function path (e.g. \`messages:send\` or \`users:create\`) and optional arguments.
Returns the mutation result.`,
  instructions: [
    'Function paths use the format "module:functionName" (e.g. "messages:send", "tasks:create")',
    'Mutations run within an ACID transaction and will be automatically retried on conflicts'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      functionPath: z
        .string()
        .describe('Path to the mutation function (e.g. "messages:send")'),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments to pass to the mutation function')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The mutation result returned by the function'),
      status: z.string().describe('Status of the mutation execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Executing mutation...');
    let result = await client.mutation(ctx.input.functionPath, ctx.input.args || {});

    return {
      output: {
        result: result.value !== undefined ? result.value : result,
        status: result.status || 'success'
      },
      message: `Mutation **${ctx.input.functionPath}** executed successfully.`
    };
  })
  .build();
