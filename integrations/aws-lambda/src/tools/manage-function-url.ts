import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let corsConfigSchema = z
  .object({
    allowCredentials: z.boolean().optional().describe('Allow credentials in CORS requests'),
    allowHeaders: z.array(z.string()).optional().describe('Allowed headers'),
    allowMethods: z.array(z.string()).optional().describe('Allowed HTTP methods'),
    allowOrigins: z.array(z.string()).optional().describe('Allowed origins'),
    exposeHeaders: z.array(z.string()).optional().describe('Headers to expose in responses'),
    maxAge: z.number().optional().describe('Cache duration for preflight requests in seconds')
  })
  .optional();

export let manageFunctionUrl = SlateTool.create(spec, {
  name: 'Manage Function URL',
  key: 'manage_function_url',
  description: `Create, update, get, or delete a dedicated HTTPS endpoint (function URL) for a Lambda function. Function URLs provide public API access without needing API Gateway. Supports IAM authentication or open access, and configurable CORS.`,
  instructions: [
    'Use **action** to specify: "create", "update", "get", or "delete".',
    'Set authType to "NONE" for public access or "AWS_IAM" to require SigV4 signatures.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      qualifier: z.string().optional().describe('Alias name to associate the URL with'),
      authType: z
        .enum(['AWS_IAM', 'NONE'])
        .optional()
        .describe('Authentication type (required for create)'),
      cors: corsConfigSchema.describe('CORS configuration'),
      invokeMode: z.enum(['BUFFERED', 'RESPONSE_STREAM']).optional().describe('Response mode')
    })
  )
  .output(
    z.object({
      functionUrl: z.string().optional().describe('The HTTPS endpoint URL'),
      functionArn: z.string().optional().describe('Function ARN'),
      authType: z.string().optional().describe('Authentication type'),
      cors: z.any().optional().describe('CORS configuration'),
      invokeMode: z.string().optional().describe('Response mode'),
      creationTime: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, qualifier } = ctx.input;

    if (action === 'get') {
      let result = await client.getFunctionUrlConfig(functionName, qualifier);
      return {
        output: {
          functionUrl: result.FunctionUrl,
          functionArn: result.FunctionArn,
          authType: result.AuthType,
          cors: result.Cors,
          invokeMode: result.InvokeMode,
          creationTime: result.CreationTime
        },
        message: `Function URL: **${result.FunctionUrl}** (auth: ${result.AuthType}).`
      };
    }

    if (action === 'delete') {
      await client.deleteFunctionUrlConfig(functionName, qualifier);
      return {
        output: { deleted: true },
        message: `Deleted function URL for **${functionName}**.`
      };
    }

    let buildParams = (): Record<string, any> => {
      let params: Record<string, any> = {};
      if (ctx.input.authType) params.AuthType = ctx.input.authType;
      if (ctx.input.invokeMode) params.InvokeMode = ctx.input.invokeMode;
      if (ctx.input.cors) {
        let corsObj: Record<string, any> = {};
        if (ctx.input.cors.allowCredentials !== undefined)
          corsObj.AllowCredentials = ctx.input.cors.allowCredentials;
        if (ctx.input.cors.allowHeaders) corsObj.AllowHeaders = ctx.input.cors.allowHeaders;
        if (ctx.input.cors.allowMethods) corsObj.AllowMethods = ctx.input.cors.allowMethods;
        if (ctx.input.cors.allowOrigins) corsObj.AllowOrigins = ctx.input.cors.allowOrigins;
        if (ctx.input.cors.exposeHeaders) corsObj.ExposeHeaders = ctx.input.cors.exposeHeaders;
        if (ctx.input.cors.maxAge !== undefined) corsObj.MaxAge = ctx.input.cors.maxAge;
        params.Cors = corsObj;
      }
      return params;
    };

    if (action === 'create') {
      if (!ctx.input.authType)
        throw lambdaServiceError('authType is required for creating a function URL');
      let result = await client.createFunctionUrlConfig(
        functionName,
        buildParams(),
        qualifier
      );
      return {
        output: {
          functionUrl: result.FunctionUrl,
          functionArn: result.FunctionArn,
          authType: result.AuthType,
          cors: result.Cors,
          invokeMode: result.InvokeMode,
          creationTime: result.CreationTime
        },
        message: `Created function URL: **${result.FunctionUrl}** (auth: ${result.AuthType}).`
      };
    }

    // update
    let result = await client.updateFunctionUrlConfig(functionName, buildParams(), qualifier);
    return {
      output: {
        functionUrl: result.FunctionUrl,
        functionArn: result.FunctionArn,
        authType: result.AuthType,
        cors: result.Cors,
        invokeMode: result.InvokeMode,
        creationTime: result.CreationTime
      },
      message: `Updated function URL: **${result.FunctionUrl}**.`
    };
  })
  .build();
