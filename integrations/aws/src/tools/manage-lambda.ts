import {
  DeleteFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  ListFunctionsCommand,
  UpdateFunctionConfigurationCommand
} from '@aws-sdk/client-lambda';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let functionSummarySchema = z.object({
  functionName: z.string().optional().describe('Name of the function'),
  functionArn: z.string().optional().describe('ARN of the function'),
  runtime: z
    .string()
    .optional()
    .describe('Runtime environment (e.g., nodejs22.x, python3.13)'),
  role: z.string().optional().describe('Execution role ARN'),
  handler: z.string().optional().describe('Function handler (e.g., index.handler)'),
  codeSize: z.number().optional().describe('Size of the deployment package in bytes'),
  description: z.string().optional().describe('Function description'),
  timeout: z.number().optional().describe('Execution timeout in seconds'),
  memorySize: z.number().optional().describe('Memory allocated in MB'),
  lastModified: z.string().optional().describe('Last modified timestamp'),
  version: z.string().optional().describe('Function version'),
  state: z.string().optional().describe('Current state of the function'),
  packageType: z.string().optional().describe('Deployment package type (Zip or Image)'),
  architectures: z.array(z.string()).optional().describe('Instruction set architectures')
});

let functionDetailSchema = functionSummarySchema.extend({
  codeSha256: z.string().optional().describe('SHA256 hash of the deployment package'),
  stateReason: z.string().optional().describe('Reason for current state'),
  environment: z.record(z.string(), z.string()).optional().describe('Environment variables'),
  layers: z
    .array(
      z.object({
        arn: z.string().optional().describe('Layer version ARN'),
        codeSize: z.number().optional().describe('Size of the layer in bytes')
      })
    )
    .optional()
    .describe('Attached layers'),
  codeLocation: z
    .string()
    .optional()
    .describe('Pre-signed URL to download the deployment package'),
  reservedConcurrency: z.number().optional().describe('Reserved concurrent executions'),
  tags: z.record(z.string(), z.string()).optional().describe('Resource tags'),
  ephemeralStorageSize: z.number().optional().describe('Ephemeral /tmp storage size in MB'),
  loggingFormat: z.string().optional().describe('Log format (Text or JSON)'),
  tracingMode: z.string().optional().describe('X-Ray tracing mode'),
  vpcId: z.string().optional().describe('VPC ID if configured'),
  subnetIds: z.array(z.string()).optional().describe('VPC subnet IDs'),
  securityGroupIds: z.array(z.string()).optional().describe('VPC security group IDs')
});

let mapFunctionSummary = (f: any) => ({
  functionName: f.FunctionName,
  functionArn: f.FunctionArn,
  runtime: f.Runtime,
  role: f.Role,
  handler: f.Handler,
  codeSize: f.CodeSize,
  description: f.Description,
  timeout: f.Timeout,
  memorySize: f.MemorySize,
  lastModified: f.LastModified,
  version: f.Version,
  state: f.State,
  packageType: f.PackageType,
  architectures: f.Architectures
});

let parsePayload = (payload: Uint8Array | undefined) => {
  if (!payload) return undefined;
  let text = new TextDecoder().decode(payload);
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export let manageLambdaTool = SlateTool.create(spec, {
  name: 'Manage Lambda',
  key: 'manage_lambda',
  description: `Manage AWS Lambda functions: list functions, get details, invoke a function with a JSON payload, update configuration (memory, timeout, environment variables, layers, VPC, tracing), or delete a function. Set the **operation** field to choose the action.`,
  instructions: [
    'Set "operation" to one of: "list", "get", "invoke", "updateConfiguration", or "delete".',
    'For "list": optionally provide "maxItems" and "marker" for pagination.',
    'For "get": provide "functionName" and optionally "qualifier" (version or alias).',
    'For "invoke": provide "functionName" and optionally "payload", "invocationType", and "logType".',
    'For "updateConfiguration": provide "functionName" and the configuration fields to change. Environment variables replace the entire set.',
    'For "delete": provide "functionName" and optionally "qualifier" to delete a specific version.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'get', 'invoke', 'updateConfiguration', 'delete'])
        .describe('The operation to perform on Lambda functions'),
      functionName: z
        .string()
        .optional()
        .describe(
          'Function name, ARN, or partial ARN (required for get, invoke, updateConfiguration, delete)'
        ),
      qualifier: z
        .string()
        .optional()
        .describe('Version number or alias name (used with get, invoke, delete)'),
      maxItems: z
        .number()
        .optional()
        .describe('Maximum number of functions to return when listing (1-10000)'),
      marker: z.string().optional().describe('Pagination token from a previous list response'),
      payload: z.any().optional().describe('JSON payload to send when invoking the function'),
      invocationType: z
        .enum(['RequestResponse', 'Event', 'DryRun'])
        .optional()
        .describe(
          'Invocation type: RequestResponse (sync, default), Event (async), or DryRun (validate only)'
        ),
      logType: z
        .enum(['None', 'Tail'])
        .optional()
        .describe(
          'Set to "Tail" to include the last 4KB of execution logs in the invoke response'
        ),
      configuration: z
        .object({
          role: z.string().optional().describe('New execution role ARN'),
          runtime: z
            .string()
            .optional()
            .describe('New runtime (e.g., nodejs22.x, python3.13)'),
          handler: z.string().optional().describe('New handler (e.g., index.handler)'),
          description: z.string().optional().describe('New function description'),
          timeout: z.number().optional().describe('New execution timeout in seconds (1-900)'),
          memorySize: z
            .number()
            .optional()
            .describe('New memory allocation in MB (128-10240)'),
          environment: z
            .record(z.string(), z.string())
            .optional()
            .describe('New environment variables (replaces all existing variables)'),
          layers: z
            .array(z.string())
            .optional()
            .describe('New layer version ARNs (replaces all existing layers)'),
          ephemeralStorageSize: z
            .number()
            .optional()
            .describe('New /tmp storage size in MB (512-10240)'),
          tracingMode: z
            .enum(['Active', 'PassThrough'])
            .optional()
            .describe('X-Ray tracing mode'),
          vpcSubnetIds: z
            .array(z.string())
            .optional()
            .describe('VPC subnet IDs (provide empty array to remove VPC)'),
          vpcSecurityGroupIds: z
            .array(z.string())
            .optional()
            .describe('VPC security group IDs')
        })
        .optional()
        .describe('Configuration fields to update (only for updateConfiguration operation)')
    })
  )
  .output(
    z.object({
      operation: z.string().describe('The operation that was performed'),
      functions: z
        .array(functionSummarySchema)
        .optional()
        .describe('List of Lambda functions (list operation)'),
      nextMarker: z
        .string()
        .optional()
        .describe('Pagination token for the next page (list operation)'),
      functionDetail: functionDetailSchema
        .optional()
        .describe('Detailed function information (get operation)'),
      statusCode: z
        .number()
        .optional()
        .describe('HTTP status code from invocation (200=sync, 202=async, 204=dry run)'),
      response: z
        .any()
        .optional()
        .describe('Function response payload (invoke operation, synchronous only)'),
      functionError: z
        .string()
        .optional()
        .describe('Error type if the function returned an error (invoke operation)'),
      executedVersion: z
        .string()
        .optional()
        .describe('Version that was executed (invoke operation)'),
      logResult: z
        .string()
        .optional()
        .describe('Last 4KB of execution log when logType is Tail (invoke operation)'),
      updatedConfiguration: functionSummarySchema
        .optional()
        .describe('Updated function configuration (updateConfiguration operation)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the function was successfully deleted (delete operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list') {
      let result = await client.send('Lambda ListFunctions', () =>
        client.lambda.send(
          new ListFunctionsCommand({
            MaxItems: ctx.input.maxItems,
            Marker: ctx.input.marker
          })
        )
      );
      let functions = (result.Functions ?? []).map(mapFunctionSummary);

      return {
        output: {
          operation: 'list',
          functions,
          nextMarker: result.NextMarker
        },
        message: `Found **${functions.length}** Lambda function(s)${result.NextMarker ? ' (more available)' : ''}.`
      };
    }

    if (!ctx.input.functionName) {
      throw awsServiceError(
        `The "functionName" field is required for the "${operation}" operation.`
      );
    }

    if (operation === 'get') {
      let result = await client.send('Lambda GetFunction', () =>
        client.lambda.send(
          new GetFunctionCommand({
            FunctionName: ctx.input.functionName,
            Qualifier: ctx.input.qualifier
          })
        )
      );
      let config = result.Configuration ?? {};
      let layers = (config.Layers ?? []).map(layer => ({
        arn: layer.Arn,
        codeSize: layer.CodeSize
      }));

      let detail = {
        ...mapFunctionSummary(config),
        codeSha256: config.CodeSha256,
        stateReason: config.StateReason,
        environment: config.Environment?.Variables,
        layers,
        codeLocation: result.Code?.Location,
        reservedConcurrency: result.Concurrency?.ReservedConcurrentExecutions,
        tags: result.Tags,
        ephemeralStorageSize: config.EphemeralStorage?.Size,
        loggingFormat: config.LoggingConfig?.LogFormat,
        tracingMode: config.TracingConfig?.Mode,
        vpcId: config.VpcConfig?.VpcId,
        subnetIds: config.VpcConfig?.SubnetIds,
        securityGroupIds: config.VpcConfig?.SecurityGroupIds
      };

      return {
        output: {
          operation: 'get',
          functionDetail: detail
        },
        message: `Retrieved function **${config.FunctionName}** (${config.Runtime || config.PackageType || 'unknown'}, ${config.State || 'Active'}).`
      };
    }

    if (operation === 'invoke') {
      let body =
        ctx.input.payload !== undefined
          ? new TextEncoder().encode(JSON.stringify(ctx.input.payload))
          : undefined;
      let result = await client.send('Lambda Invoke', () =>
        client.lambda.send(
          new InvokeCommand({
            FunctionName: ctx.input.functionName,
            Qualifier: ctx.input.qualifier,
            Payload: body,
            InvocationType: ctx.input.invocationType,
            LogType: ctx.input.logType
          })
        )
      );
      let invType = ctx.input.invocationType || 'RequestResponse';
      let msg =
        invType === 'Event'
          ? `Function **${ctx.input.functionName}** invoked asynchronously.`
          : invType === 'DryRun'
            ? `Dry run completed for **${ctx.input.functionName}** -- permissions validated.`
            : `Function **${ctx.input.functionName}** invoked successfully.`;

      return {
        output: {
          operation: 'invoke',
          statusCode: result.StatusCode,
          response: parsePayload(result.Payload),
          functionError: result.FunctionError,
          executedVersion: result.ExecutedVersion,
          logResult: result.LogResult
        },
        message: msg
      };
    }

    if (operation === 'updateConfiguration') {
      if (!ctx.input.configuration) {
        throw awsServiceError(
          'The "configuration" field is required for the "updateConfiguration" operation.'
        );
      }

      let cfg = ctx.input.configuration;
      let hasUpdate = Object.values(cfg).some(value => value !== undefined);
      if (!hasUpdate) {
        throw awsServiceError('At least one configuration field must be provided to update.');
      }

      let result = await client.send('Lambda UpdateFunctionConfiguration', () =>
        client.lambda.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: ctx.input.functionName,
            Role: cfg.role,
            Runtime: cfg.runtime as any,
            Handler: cfg.handler,
            Description: cfg.description,
            Timeout: cfg.timeout,
            MemorySize: cfg.memorySize,
            Environment: cfg.environment ? { Variables: cfg.environment } : undefined,
            Layers: cfg.layers,
            EphemeralStorage:
              cfg.ephemeralStorageSize !== undefined
                ? { Size: cfg.ephemeralStorageSize }
                : undefined,
            TracingConfig: cfg.tracingMode ? { Mode: cfg.tracingMode as any } : undefined,
            VpcConfig:
              cfg.vpcSubnetIds !== undefined || cfg.vpcSecurityGroupIds !== undefined
                ? {
                    SubnetIds: cfg.vpcSubnetIds,
                    SecurityGroupIds: cfg.vpcSecurityGroupIds
                  }
                : undefined
          })
        )
      );

      return {
        output: {
          operation: 'updateConfiguration',
          updatedConfiguration: mapFunctionSummary(result)
        },
        message: `Updated configuration for function **${result.FunctionName || ctx.input.functionName}**.`
      };
    }

    if (operation === 'delete') {
      await client.send('Lambda DeleteFunction', () =>
        client.lambda.send(
          new DeleteFunctionCommand({
            FunctionName: ctx.input.functionName,
            Qualifier: ctx.input.qualifier
          })
        )
      );

      return {
        output: {
          operation: 'delete',
          deleted: true
        },
        message: `Deleted function **${ctx.input.functionName}**.`
      };
    }

    throw awsServiceError(
      `Unknown operation: "${operation}". Expected one of: list, get, invoke, updateConfiguration, delete.`
    );
  })
  .build();
