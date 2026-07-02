import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let runAction = SlateTool.create(spec, {
  name: 'Run Action',
  key: 'run_action',
  description: `Execute a Convex action function over HTTP. Actions can call external APIs, use third-party libraries, and perform side effects that are not possible in queries or mutations.
Specify the function path (e.g. \`ai:generateEmbedding\` or \`email:send\`) and optional arguments.
Returns the action result.`,
  instructions: [
    'Function paths use the format "module:functionName" (e.g. "ai:generate", "email:send")',
    'Actions may take longer to execute than queries or mutations since they can call external services'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      functionPath: z
        .string()
        .describe('Path to the action function (e.g. "ai:generateEmbedding")'),
      args: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arguments to pass to the action function')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The action result returned by the function'),
      status: z.string().describe('Status of the action execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    ctx.progress('Executing action...');
    let result = await client.action(ctx.input.functionPath, ctx.input.args || {});

    return {
      output: {
        result: result.value !== undefined ? result.value : result,
        status: result.status || 'success'
      },
      message: `Action **${ctx.input.functionPath}** executed successfully.`
    };
  })
  .build();
