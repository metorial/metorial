import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRecursionConfig = SlateTool.create(spec, {
  name: 'Manage Recursion Config',
  key: 'manage_recursion_config',
  description: `Get or set recursive loop detection for a Lambda function. Lambda defaults to terminating detected recursive invocation loops; only use Allow for intentional recursive designs with safeguards.`,
  instructions: [
    'Use action "get" to read the current recursive loop setting.',
    'Use action "set" with recursiveLoop set to "Terminate" or "Allow".'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'set']).describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      recursiveLoop: z
        .enum(['Allow', 'Terminate'])
        .optional()
        .describe('Recursive loop handling to set')
    })
  )
  .output(
    z.object({
      recursiveLoop: z
        .string()
        .optional()
        .describe('Recursive loop handling: Allow or Terminate')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName } = ctx.input;

    if (action === 'get') {
      let result = await client.getFunctionRecursionConfig(functionName);
      return {
        output: {
          recursiveLoop: result.RecursiveLoop
        },
        message: `Recursive loop detection for **${functionName}** is **${result.RecursiveLoop}**.`
      };
    }

    if (!ctx.input.recursiveLoop) {
      throw lambdaServiceError('recursiveLoop is required for set.');
    }

    let result = await client.putFunctionRecursionConfig(
      functionName,
      ctx.input.recursiveLoop
    );
    return {
      output: {
        recursiveLoop: result.RecursiveLoop
      },
      message: `Set recursive loop detection for **${functionName}** to **${result.RecursiveLoop}**.`
    };
  })
  .build();
