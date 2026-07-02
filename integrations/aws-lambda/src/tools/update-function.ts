import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateFunction = SlateTool.create(spec, {
  name: 'Update Function',
  key: 'update_function',
  description: `Update a Lambda function's code and/or configuration. Provide **code** fields to update the deployment package, or **configuration** fields to modify settings like runtime, handler, memory, timeout, environment variables, layers, and VPC. Both can be updated in a single call.`,
  instructions: [
    'Code and configuration updates are applied separately via two API calls if both are provided.',
    'Environment variables replace the entire set — provide all variables you want to keep.'
  ]
})
  .input(
    z.object({
      functionName: z.string().describe('Function name or ARN'),
      code: z
        .object({
          s3Bucket: z
            .string()
            .optional()
            .describe('S3 bucket containing the new code package'),
          s3Key: z.string().optional().describe('S3 object key'),
          s3ObjectVersion: z.string().optional().describe('S3 object version'),
          imageUri: z.string().optional().describe('Container image URI from ECR'),
          zipFile: z.string().optional().describe('Base64-encoded ZIP file content'),
          publish: z
            .boolean()
            .optional()
            .describe('Publish a new version after updating code'),
          architectures: z
            .array(z.enum(['x86_64', 'arm64']))
            .optional()
            .describe('Target architecture')
        })
        .optional()
        .describe('New function code'),
      configuration: z
        .object({
          role: z.string().optional().describe('New execution role ARN'),
          runtime: z.string().optional().describe('New runtime'),
          handler: z.string().optional().describe('New handler'),
          description: z.string().optional().describe('New description'),
          timeout: z.number().optional().describe('New timeout in seconds'),
          memorySize: z.number().optional().describe('New memory size in MB'),
          environment: z
            .record(z.string(), z.string())
            .optional()
            .describe('New environment variables (replaces existing)'),
          layers: z
            .array(z.string())
            .optional()
            .describe('New layer ARNs (replaces existing)'),
          ephemeralStorageSize: z.number().optional().describe('New /tmp storage in MB'),
          tracingMode: z
            .enum(['Active', 'PassThrough'])
            .optional()
            .describe('X-Ray tracing mode'),
          vpcSubnetIds: z.array(z.string()).optional().describe('VPC subnet IDs'),
          vpcSecurityGroupIds: z
            .array(z.string())
            .optional()
            .describe('VPC security group IDs')
        })
        .optional()
        .describe('Configuration changes')
    })
  )
  .output(
    z.object({
      functionName: z.string().describe('Name of the updated function'),
      functionArn: z.string().describe('ARN of the updated function'),
      runtime: z.string().optional().describe('Runtime after update'),
      state: z.string().optional().describe('Function state after update'),
      version: z.string().optional().describe('Published version (if code was published)'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      codeUpdated: z.boolean().describe('Whether the code was updated'),
      configUpdated: z.boolean().describe('Whether the configuration was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let codeUpdated = false;
    let configUpdated = false;
    let lastResult: any = {};

    if (!ctx.input.code && !ctx.input.configuration) {
      throw lambdaServiceError('Provide code, configuration, or both to update a function.');
    }

    if (ctx.input.code) {
      let codeParams: Record<string, any> = {};
      if (ctx.input.code.s3Bucket) codeParams.S3Bucket = ctx.input.code.s3Bucket;
      if (ctx.input.code.s3Key) codeParams.S3Key = ctx.input.code.s3Key;
      if (ctx.input.code.s3ObjectVersion)
        codeParams.S3ObjectVersion = ctx.input.code.s3ObjectVersion;
      if (ctx.input.code.imageUri) codeParams.ImageUri = ctx.input.code.imageUri;
      if (ctx.input.code.zipFile) codeParams.ZipFile = ctx.input.code.zipFile;
      if (ctx.input.code.publish !== undefined) codeParams.Publish = ctx.input.code.publish;
      if (ctx.input.code.architectures)
        codeParams.Architectures = ctx.input.code.architectures;

      lastResult = await client.updateFunctionCode(ctx.input.functionName, codeParams);
      codeUpdated = true;
    }

    if (ctx.input.configuration) {
      let configParams: Record<string, any> = {};
      let cfg = ctx.input.configuration;

      if (cfg.role) configParams.Role = cfg.role;
      if (cfg.runtime) configParams.Runtime = cfg.runtime;
      if (cfg.handler) configParams.Handler = cfg.handler;
      if (cfg.description !== undefined) configParams.Description = cfg.description;
      if (cfg.timeout) configParams.Timeout = cfg.timeout;
      if (cfg.memorySize) configParams.MemorySize = cfg.memorySize;
      if (cfg.environment) configParams.Environment = { Variables: cfg.environment };
      if (cfg.layers) configParams.Layers = cfg.layers;
      if (cfg.ephemeralStorageSize)
        configParams.EphemeralStorage = { Size: cfg.ephemeralStorageSize };
      if (cfg.tracingMode) configParams.TracingConfig = { Mode: cfg.tracingMode };
      if (cfg.vpcSubnetIds || cfg.vpcSecurityGroupIds) {
        configParams.VpcConfig = {
          SubnetIds: cfg.vpcSubnetIds || [],
          SecurityGroupIds: cfg.vpcSecurityGroupIds || []
        };
      }

      lastResult = await client.updateFunctionConfiguration(
        ctx.input.functionName,
        configParams
      );
      configUpdated = true;
    }

    let parts: string[] = [];
    if (codeUpdated) parts.push('code');
    if (configUpdated) parts.push('configuration');

    return {
      output: {
        functionName: lastResult.FunctionName || ctx.input.functionName,
        functionArn: lastResult.FunctionArn || '',
        runtime: lastResult.Runtime,
        state: lastResult.State,
        version: lastResult.Version,
        lastModified: lastResult.LastModified,
        codeUpdated,
        configUpdated
      },
      message: `Updated ${parts.join(' and ')} for function **${lastResult.FunctionName || ctx.input.functionName}**.`
    };
  })
  .build();
