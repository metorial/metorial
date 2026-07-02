import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Retrieve detailed information about a specific Promptmate.io app, including its required data fields and response fields. Use this to understand what input data an app needs before running a job.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Unique identifier of the app to retrieve')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique identifier for the app'),
      appName: z.string().describe('Name of the app'),
      creditEstimate: z.number().optional().describe('Estimated credit usage per row'),
      dataFields: z
        .array(z.string())
        .optional()
        .describe('List of data field names required by the app'),
      responseFields: z
        .array(
          z.object({
            name: z.string().describe('Name of the response field'),
            type: z.string().optional().describe('Type of the response field'),
            description: z.string().optional().describe('Description of the response field')
          })
        )
        .optional()
        .describe('List of data fields returned by the app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let app = await client.getApp(ctx.input.appId);

    return {
      output: app,
      message: `Retrieved app **${app.appName}** (${app.appId}). Requires fields: ${app.dataFields?.join(', ') || 'none'}.`
    };
  })
  .build();
