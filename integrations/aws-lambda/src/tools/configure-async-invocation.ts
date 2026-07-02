import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let configureAsyncInvocation = SlateTool.create(spec, {
  name: 'Configure Async Invocation',
  key: 'configure_async_invocation',
  description: `List, get, set, update, or remove the asynchronous invocation configuration for a Lambda function. Controls retry behavior, maximum event age, and destination routing for successful or failed invocations (to SQS, SNS, Lambda, S3, or EventBridge).`,
  instructions: [
    'Use **action** "set" to replace the full config, "update" to patch only supplied fields, "get" to view one qualifier, "list" to view all configs, or "delete" to remove.',
    'Destinations route invocation results to other AWS services for further processing.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'set', 'update', 'delete'])
        .describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      qualifier: z.string().optional().describe('Version or alias'),
      marker: z.string().optional().describe('Pagination token for list'),
      maxItems: z.number().optional().describe('Maximum configs to return for list (1-50)'),
      maximumRetryAttempts: z.number().optional().describe('Max retry attempts (0-2)'),
      maximumEventAgeInSeconds: z
        .number()
        .optional()
        .describe('Max event age before discard (60-21600)'),
      onSuccessDestinationArn: z
        .string()
        .optional()
        .describe('Destination ARN for successful invocations'),
      onFailureDestinationArn: z
        .string()
        .optional()
        .describe('Destination ARN for failed invocations')
    })
  )
  .output(
    z.object({
      functionArn: z.string().optional().describe('Function ARN'),
      maximumRetryAttempts: z.number().optional().describe('Max retry attempts'),
      maximumEventAgeInSeconds: z.number().optional().describe('Max event age in seconds'),
      onSuccessDestination: z.string().optional().describe('Success destination ARN'),
      onFailureDestination: z.string().optional().describe('Failure destination ARN'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      configs: z
        .array(
          z.object({
            functionArn: z.string().optional(),
            maximumRetryAttempts: z.number().optional(),
            maximumEventAgeInSeconds: z.number().optional(),
            onSuccessDestination: z.string().optional(),
            onFailureDestination: z.string().optional(),
            lastModified: z.string().optional()
          })
        )
        .optional()
        .describe('Async invocation configs returned by list'),
      nextMarker: z.string().optional().describe('Pagination token for the next page'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, qualifier } = ctx.input;

    let mapConfig = (result: any) => ({
      functionArn: result.FunctionArn,
      maximumRetryAttempts: result.MaximumRetryAttempts,
      maximumEventAgeInSeconds: result.MaximumEventAgeInSeconds,
      onSuccessDestination: result.DestinationConfig?.OnSuccess?.Destination,
      onFailureDestination: result.DestinationConfig?.OnFailure?.Destination,
      lastModified: result.LastModified ? String(result.LastModified) : undefined
    });

    if (action === 'list') {
      let result = await client.listFunctionEventInvokeConfigs(
        functionName,
        ctx.input.marker,
        ctx.input.maxItems
      );
      let configs = (result.FunctionEventInvokeConfigs || []).map(mapConfig);
      return {
        output: {
          configs,
          nextMarker: result.NextMarker
        },
        message: `Found **${configs.length}** async invocation config(s) for **${functionName}**.`
      };
    }

    if (action === 'get') {
      let result = await client.getFunctionEventInvokeConfig(functionName, qualifier);
      return {
        output: mapConfig(result),
        message: `Async config for **${functionName}**: retries=${result.MaximumRetryAttempts}, maxAge=${result.MaximumEventAgeInSeconds}s.`
      };
    }

    if (action === 'delete') {
      await client.deleteFunctionEventInvokeConfig(functionName, qualifier);
      return {
        output: { deleted: true },
        message: `Removed async invocation config from **${functionName}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.maximumRetryAttempts !== undefined)
      params.MaximumRetryAttempts = ctx.input.maximumRetryAttempts;
    if (ctx.input.maximumEventAgeInSeconds !== undefined)
      params.MaximumEventAgeInSeconds = ctx.input.maximumEventAgeInSeconds;

    let destConfig: Record<string, any> = {};
    if (ctx.input.onSuccessDestinationArn)
      destConfig.OnSuccess = { Destination: ctx.input.onSuccessDestinationArn };
    if (ctx.input.onFailureDestinationArn)
      destConfig.OnFailure = { Destination: ctx.input.onFailureDestinationArn };
    if (Object.keys(destConfig).length > 0) params.DestinationConfig = destConfig;

    let result =
      action === 'update'
        ? await client.updateFunctionEventInvokeConfig(functionName, params, qualifier)
        : await client.putFunctionEventInvokeConfig(functionName, params, qualifier);
    return {
      output: mapConfig(result),
      message:
        action === 'update'
          ? `Patched async invocation config for **${functionName}**.`
          : `Updated async invocation config for **${functionName}**.`
    };
  })
  .build();
