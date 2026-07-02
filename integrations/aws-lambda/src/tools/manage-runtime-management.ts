import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRuntimeManagement = SlateTool.create(spec, {
  name: 'Manage Runtime Management',
  key: 'manage_runtime_management',
  description: `Get or set the runtime update mode for a Lambda function version. Runtime management controls whether Lambda applies runtime patches automatically, on function updates, or pins a manual runtime version ARN.`,
  instructions: [
    'Use action "get" to read the current runtime update mode.',
    'Use action "set" with updateRuntimeOn. Manual mode also requires runtimeVersionArn.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'set']).describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      qualifier: z
        .string()
        .optional()
        .describe('Function version. Defaults to $LATEST when omitted'),
      updateRuntimeOn: z
        .enum(['Auto', 'Manual', 'FunctionUpdate'])
        .optional()
        .describe('Runtime update mode to set'),
      runtimeVersionArn: z
        .string()
        .optional()
        .describe('Runtime version ARN required when updateRuntimeOn is Manual')
    })
  )
  .output(
    z.object({
      functionArn: z.string().optional().describe('Function ARN'),
      updateRuntimeOn: z.string().optional().describe('Runtime update mode'),
      runtimeVersionArn: z
        .string()
        .nullable()
        .optional()
        .describe('Pinned runtime version ARN when manual mode is configured')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, qualifier } = ctx.input;

    if (action === 'get') {
      let result = await client.getRuntimeManagementConfig(functionName, qualifier);
      return {
        output: {
          functionArn: result.FunctionArn,
          updateRuntimeOn: result.UpdateRuntimeOn,
          runtimeVersionArn: result.RuntimeVersionArn ?? null
        },
        message: `Runtime management for **${functionName}** is **${result.UpdateRuntimeOn}**.`
      };
    }

    if (!ctx.input.updateRuntimeOn) {
      throw lambdaServiceError('updateRuntimeOn is required for set.');
    }
    if (ctx.input.updateRuntimeOn === 'Manual' && !ctx.input.runtimeVersionArn) {
      throw lambdaServiceError(
        'runtimeVersionArn is required when updateRuntimeOn is Manual.'
      );
    }

    let params: Record<string, any> = {
      UpdateRuntimeOn: ctx.input.updateRuntimeOn
    };
    if (ctx.input.runtimeVersionArn) {
      params.RuntimeVersionArn = ctx.input.runtimeVersionArn;
    }

    let result = await client.putRuntimeManagementConfig(functionName, params, qualifier);
    return {
      output: {
        functionArn: result.FunctionArn,
        updateRuntimeOn: result.UpdateRuntimeOn,
        runtimeVersionArn: result.RuntimeVersionArn ?? null
      },
      message: `Set runtime management for **${functionName}** to **${result.UpdateRuntimeOn}**.`
    };
  })
  .build();
