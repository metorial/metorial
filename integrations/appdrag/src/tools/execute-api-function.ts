import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let executeApiFunction = SlateTool.create(spec, {
  name: 'Execute API Function',
  key: 'execute_api_function',
  description: `Execute a Cloud Backend API function. Cloud functions run on AWS Lambda and can be written in Node.js, Python, C#, Go, Java, Ruby, or SQL.
The function is called at \`https://{appId}.appdrag.site/api/{path}\` with the specified HTTP method and parameters.`,
  instructions: [
    'The path should include the folder and function name, e.g., "/users/get-user" for a function named "get-user" in the "users" folder.',
    'Parameters are passed as form-data (for POST/PUT/PATCH/DELETE) or query string (for GET).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      path: z
        .string()
        .describe(
          'The function path including folder and function name, e.g., "/users/get-user".'
        ),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .default('POST')
        .describe('HTTP method for the function call.'),
      parameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value parameters to pass to the function.')
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe(
          'The response from the cloud function. The structure depends on the function implementation.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let response = await client.executeFunction({
      path: ctx.input.path,
      method: ctx.input.method,
      data: ctx.input.parameters
    });

    return {
      output: {
        response
      },
      message: `Executed function **${ctx.input.path}** via ${ctx.input.method}.`
    };
  })
  .build();
