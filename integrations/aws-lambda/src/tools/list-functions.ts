import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let functionConfigSchema = z.object({
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

export let listFunctions = SlateTool.create(spec, {
  name: 'List Functions',
  key: 'list_functions',
  description: `List Lambda functions in the configured AWS region. Returns function names, ARNs, runtimes, and key configuration. Use **maxItems** to control page size and **marker** for pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      maxItems: z
        .number()
        .optional()
        .describe('Maximum number of functions to return (1-10000)'),
      marker: z.string().optional().describe('Pagination token from previous response'),
      includeAllVersions: z
        .boolean()
        .optional()
        .describe('Set to true to include all published versions')
    })
  )
  .output(
    z.object({
      functions: z.array(functionConfigSchema).describe('List of Lambda functions'),
      nextMarker: z.string().optional().describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let functionVersion = ctx.input.includeAllVersions ? 'ALL' : undefined;
    let result = await client.listFunctions(
      ctx.input.marker,
      ctx.input.maxItems,
      functionVersion
    );

    let functions = (result.Functions || []).map((f: any) => ({
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
    }));

    return {
      output: {
        functions,
        nextMarker: result.NextMarker
      },
      message: `Found **${functions.length}** Lambda function(s)${result.NextMarker ? ' (more available)' : ''}.`
    };
  })
  .build();
