import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger an Appsmith workflow by sending a POST request to its webhook URL. The workflow receives the provided JSON payload as input parameters and may return a response. Requires Business or Enterprise edition.`,
  instructions: [
    'The webhook URL is unique to each workflow and is generated when the workflow webhook trigger is enabled in Appsmith.',
    'The payload must be a valid JSON object.'
  ]
})
  .input(
    z.object({
      webhookUrl: z
        .string()
        .describe('The full webhook URL of the Appsmith workflow to trigger.'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON payload to send as the workflow input parameters.')
    })
  )
  .output(
    z.object({
      response: z.any().optional().describe('The response returned by the workflow, if any.'),
      triggered: z.boolean().describe('Whether the workflow was successfully triggered.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token ?? ''
    });

    try {
      let response = await client.triggerWorkflow(
        ctx.input.webhookUrl,
        ctx.input.payload ?? {}
      );

      return {
        output: {
          response,
          triggered: true
        },
        message: `Successfully triggered workflow.`
      };
    } catch (err: any) {
      return {
        output: {
          response: err?.response?.data ?? err?.message,
          triggered: false
        },
        message: `Failed to trigger workflow: ${err?.message ?? 'Unknown error'}`
      };
    }
  })
  .build();
