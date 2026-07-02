import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createFunction = SlateTool.create(spec, {
  name: 'Create Function',
  key: 'create_function',
  description: `Create a new Lambda function. Provide the function code via an S3 location, container image URI, or base64-encoded ZIP file. Requires a function name and an IAM execution role ARN at minimum.`,
  instructions: [
    'For ZIP deployments, specify runtime and handler. For container images, set packageType to "Image".',
    'The role must be an IAM role ARN that Lambda can assume (e.g., arn:aws:iam::123456789012:role/my-role).'
  ]
})
  .input(
    z.object({
      functionName: z.string().describe('Name for the function (1-64 characters)'),
      role: z.string().describe('IAM execution role ARN'),
      code: z
        .object({
          s3Bucket: z.string().optional().describe('S3 bucket containing the code package'),
          s3Key: z.string().optional().describe('S3 object key for the code package'),
          s3ObjectVersion: z.string().optional().describe('S3 object version'),
          imageUri: z.string().optional().describe('Container image URI from ECR'),
          zipFile: z.string().optional().describe('Base64-encoded ZIP file content')
        })
        .describe('Function code source'),
      runtime: z
        .string()
        .optional()
        .describe('Runtime (e.g., nodejs22.x, python3.13, java21)'),
      handler: z.string().optional().describe('Handler function (e.g., index.handler)'),
      description: z.string().optional().describe('Function description'),
      timeout: z
        .number()
        .optional()
        .describe('Execution timeout in seconds (1-900, default 3)'),
      memorySize: z.number().optional().describe('Memory in MB (128-10240, default 128)'),
      packageType: z.enum(['Zip', 'Image']).optional().describe('Deployment package type'),
      architectures: z
        .array(z.enum(['x86_64', 'arm64']))
        .optional()
        .describe('Instruction set architecture'),
      environment: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables as key-value pairs'),
      layers: z.array(z.string()).optional().describe('Layer ARNs to attach (up to 5)'),
      publish: z.boolean().optional().describe('Publish a version after creation'),
      ephemeralStorageSize: z
        .number()
        .optional()
        .describe('Ephemeral /tmp storage in MB (512-10240)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Resource tags as key-value pairs'),
      tracingMode: z.enum(['Active', 'PassThrough']).optional().describe('X-Ray tracing mode'),
      vpcSubnetIds: z.array(z.string()).optional().describe('VPC subnet IDs'),
      vpcSecurityGroupIds: z.array(z.string()).optional().describe('VPC security group IDs')
    })
  )
  .output(
    z.object({
      functionName: z.string().describe('Name of the created function'),
      functionArn: z.string().describe('ARN of the created function'),
      runtime: z.string().optional().describe('Runtime environment'),
      state: z.string().optional().describe('Current state'),
      version: z.string().optional().describe('Published version'),
      codeSize: z.number().optional().describe('Code package size in bytes'),
      lastModified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let codeObj: Record<string, any> = {};
    if (ctx.input.code.s3Bucket) codeObj.S3Bucket = ctx.input.code.s3Bucket;
    if (ctx.input.code.s3Key) codeObj.S3Key = ctx.input.code.s3Key;
    if (ctx.input.code.s3ObjectVersion)
      codeObj.S3ObjectVersion = ctx.input.code.s3ObjectVersion;
    if (ctx.input.code.imageUri) codeObj.ImageUri = ctx.input.code.imageUri;
    if (ctx.input.code.zipFile) codeObj.ZipFile = ctx.input.code.zipFile;

    let params: Record<string, any> = {
      FunctionName: ctx.input.functionName,
      Role: ctx.input.role,
      Code: codeObj
    };

    if (ctx.input.runtime) params.Runtime = ctx.input.runtime;
    if (ctx.input.handler) params.Handler = ctx.input.handler;
    if (ctx.input.description) params.Description = ctx.input.description;
    if (ctx.input.timeout) params.Timeout = ctx.input.timeout;
    if (ctx.input.memorySize) params.MemorySize = ctx.input.memorySize;
    if (ctx.input.packageType) params.PackageType = ctx.input.packageType;
    if (ctx.input.architectures) params.Architectures = ctx.input.architectures;
    if (ctx.input.environment) params.Environment = { Variables: ctx.input.environment };
    if (ctx.input.layers) params.Layers = ctx.input.layers;
    if (ctx.input.publish !== undefined) params.Publish = ctx.input.publish;
    if (ctx.input.ephemeralStorageSize)
      params.EphemeralStorage = { Size: ctx.input.ephemeralStorageSize };
    if (ctx.input.tags) params.Tags = ctx.input.tags;
    if (ctx.input.tracingMode) params.TracingConfig = { Mode: ctx.input.tracingMode };
    if (ctx.input.vpcSubnetIds || ctx.input.vpcSecurityGroupIds) {
      params.VpcConfig = {
        SubnetIds: ctx.input.vpcSubnetIds || [],
        SecurityGroupIds: ctx.input.vpcSecurityGroupIds || []
      };
    }

    let result = await client.createFunction(params);

    return {
      output: {
        functionName: result.FunctionName,
        functionArn: result.FunctionArn,
        runtime: result.Runtime,
        state: result.State,
        version: result.Version,
        codeSize: result.CodeSize,
        lastModified: result.LastModified
      },
      message: `Created function **${result.FunctionName}** (${result.FunctionArn}).`
    };
  })
  .build();
