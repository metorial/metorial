import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFunction = SlateTool.create(spec, {
  name: 'Get Function',
  key: 'get_function',
  description: `Retrieve detailed information about a Lambda function including its configuration, code location, concurrency settings, and tags. Supports fetching a specific version or alias using the **qualifier** parameter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      functionName: z.string().describe('Function name, ARN, or partial ARN'),
      qualifier: z.string().optional().describe('Version number or alias name')
    })
  )
  .output(
    z.object({
      functionName: z.string().optional().describe('Name of the function'),
      functionArn: z.string().optional().describe('ARN of the function'),
      runtime: z.string().optional().describe('Runtime environment'),
      role: z.string().optional().describe('Execution role ARN'),
      handler: z.string().optional().describe('Function handler'),
      codeSize: z.number().optional().describe('Size of the deployment package in bytes'),
      codeSha256: z.string().optional().describe('SHA256 hash of the deployment package'),
      description: z.string().optional().describe('Function description'),
      timeout: z.number().optional().describe('Execution timeout in seconds'),
      memorySize: z.number().optional().describe('Memory allocated in MB'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      version: z.string().optional().describe('Function version'),
      state: z.string().optional().describe('Current state'),
      stateReason: z.string().optional().describe('Reason for current state'),
      lastUpdateStatus: z.string().optional().describe('Status of the last update'),
      lastUpdateStatusReason: z
        .string()
        .optional()
        .describe('Reason for the last update status'),
      packageType: z.string().optional().describe('Package type (Zip or Image)'),
      architectures: z.array(z.string()).optional().describe('Instruction set architectures'),
      environment: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables'),
      layers: z
        .array(
          z.object({
            arn: z.string().optional(),
            codeSize: z.number().optional()
          })
        )
        .optional()
        .describe('Attached layers'),
      codeLocation: z.string().optional().describe('Pre-signed URL to download the code'),
      reservedConcurrency: z.number().optional().describe('Reserved concurrent executions'),
      tags: z.record(z.string(), z.string()).optional().describe('Resource tags'),
      ephemeralStorageSize: z.number().optional().describe('Ephemeral storage size in MB'),
      loggingFormat: z.string().optional().describe('Log format (Text or JSON)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.getFunction(ctx.input.functionName, ctx.input.qualifier);

    let config = result.Configuration || {};
    let layers = (config.Layers || []).map((l: any) => ({
      arn: l.Arn,
      codeSize: l.CodeSize
    }));

    return {
      output: {
        functionName: config.FunctionName,
        functionArn: config.FunctionArn,
        runtime: config.Runtime,
        role: config.Role,
        handler: config.Handler,
        codeSize: config.CodeSize,
        codeSha256: config.CodeSha256,
        description: config.Description,
        timeout: config.Timeout,
        memorySize: config.MemorySize,
        lastModified: config.LastModified,
        version: config.Version,
        state: config.State,
        stateReason: config.StateReason,
        lastUpdateStatus: config.LastUpdateStatus,
        lastUpdateStatusReason: config.LastUpdateStatusReason,
        packageType: config.PackageType,
        architectures: config.Architectures,
        environment: config.Environment?.Variables,
        layers,
        codeLocation: result.Code?.Location,
        reservedConcurrency: result.Concurrency?.ReservedConcurrentExecutions,
        tags: result.Tags,
        ephemeralStorageSize: config.EphemeralStorage?.Size,
        loggingFormat: config.LoggingConfig?.LogFormat
      },
      message: `Retrieved function **${config.FunctionName}** (${config.Runtime || config.PackageType}, ${config.State || 'Active'}).`
    };
  })
  .build();
