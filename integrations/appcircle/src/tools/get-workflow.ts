import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description:
    'Retrieves a build workflow definition and its steps so you can inspect how a build runs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Build profile ID. Use list_build_profiles to discover it.'),
      workflowId: z.string().describe('Workflow ID from list_workflows.')
    })
  )
  .output(z.object({}).passthrough())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getWorkflow(ctx.input.profileId, ctx.input.workflowId);
    return { output: result, message: 'Retrieved get workflow information.' };
  })
  .build();
