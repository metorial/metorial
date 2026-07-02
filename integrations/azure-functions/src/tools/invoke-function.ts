import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let invokeFunction = SlateTool.create(spec, {
  name: 'Invoke Function',
  key: 'invoke_function',
  description: `Invoke an HTTP-triggered Azure Function directly. Sends an HTTP request to the function's runtime endpoint with the specified method, body, query parameters, and headers. Requires a function key or host key for non-anonymous functions.`,
  instructions: [
    'For anonymous functions, you can pass an empty string as the functionKey.',
    'The function must be HTTP-triggered for this tool to work.',
    'The response includes the HTTP status code, response body, and response headers.'
  ]
})
  .input(
    z.object({
      appName: z
        .string()
        .describe('Name of the function app (used to construct the hostname)'),
      functionName: z
        .string()
        .describe('Name of the function to invoke (used as the /api/{functionName} path)'),
      functionKey: z
        .string()
        .default('')
        .describe(
          'Function key, host key, or master key for authentication. Leave empty for anonymous functions'
        ),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .default('POST')
        .describe('HTTP method to use'),
      body: z.any().optional().describe('Request body (for POST, PUT, PATCH)'),
      queryParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Query string parameters'),
      headers: z.record(z.string(), z.string()).optional().describe('Additional HTTP headers')
    })
  )
  .output(
    z.object({
      statusCode: z.number().describe('HTTP response status code'),
      responseBody: z.any().describe('Response body from the function'),
      responseHeaders: z.record(z.string(), z.string()).describe('Response headers')
    })
  )
  .handleInvocation(async ctx => {
    let runtimeClient = new RuntimeClient({
      appName: ctx.input.appName,
      functionKey: ctx.input.functionKey || ''
    });

    ctx.info(`Invoking function ${ctx.input.functionName} via ${ctx.input.method}`);

    let result = await runtimeClient.invokeFunction(
      ctx.input.functionName,
      ctx.input.method,
      ctx.input.body,
      ctx.input.queryParams,
      ctx.input.headers
    );

    return {
      output: {
        statusCode: result.status,
        responseBody: result.data,
        responseHeaders: result.headers
      },
      message: `Invoked **${ctx.input.functionName}** via **${ctx.input.method}** — returned HTTP **${result.status}**.`
    };
  })
  .build();
