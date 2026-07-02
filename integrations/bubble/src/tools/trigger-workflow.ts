import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger a server-side API workflow in a Bubble application. Workflows can create records, send emails, sign up users, and perform any action available in Bubble workflows. Pass custom parameters defined by the workflow.

If the workflow is configured to return data, the response will contain the returned values.`,
  instructions: [
    'The workflow must be exposed as an API workflow in the Bubble editor under Settings → API → Workflow API.',
    'Parameter names must match exactly what is defined in the workflow configuration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workflowName: z
        .string()
        .describe('Name of the API workflow to trigger, as defined in the Bubble editor.'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Key-value pairs of parameters to pass to the workflow. Parameter names must match the workflow definition.'
        )
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe(
          'Response data returned by the workflow, if the workflow is configured to return data. May be null if the workflow does not return data.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.appBaseUrl,
      token: ctx.auth?.token
    });

    let response = await client.triggerWorkflow(
      ctx.input.workflowName,
      ctx.input.parameters ?? {}
    );

    return {
      output: {
        response
      },
      message: `Triggered workflow **${ctx.input.workflowName}**.${response ? ' Workflow returned data.' : ''}`
    };
  })
  .build();
