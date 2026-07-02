import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createActionRun = SlateTool.create(spec, {
  name: 'Create Action Run',
  key: 'create_action_run',
  description: `Run a single Zapier action asynchronously without creating a saved Zap. Zapier returns an Action Run ID that can be checked with Get Action Run.`,
  instructions: [
    'Before each action run, retrieve a fresh action ID with List Actions.',
    'Use Get Action Run to poll for queued, running, success, or error status.'
  ],
  constraints: ['Requires the action:run OAuth scope and Zapier Action Runs beta access.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('Fresh action ID from the /v2/actions endpoint'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID required by the selected action, or null'),
      inputs: z.record(z.string(), z.any()).describe('Input values for the action run')
    })
  )
  .output(
    z.object({
      actionRunId: z.string().describe('Identifier of the created Action Run'),
      type: z.string().describe('Zapier object type returned for the run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createActionRun({
      action: ctx.input.actionId,
      authentication: ctx.input.authenticationId,
      inputs: ctx.input.inputs
    });

    return {
      output: {
        actionRunId: response.data.id,
        type: response.data.type
      },
      message: `Created Action Run \`${response.data.id}\` for action \`${ctx.input.actionId}\`.`
    };
  })
  .build();
