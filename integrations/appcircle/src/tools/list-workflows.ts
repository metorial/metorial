import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, getAppcircleList } from '../lib/helpers';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `Retrieves all workflows associated with a build profile. Workflows define the sequence of build steps. Use this to find the workflow ID needed to trigger a build.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the build profile')
    })
  )
  .output(
    z.array(
      z
        .object({
          workflowId: z.string().optional(),
          workflowName: z.string().nullish()
        })
        .passthrough()
    )
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let workflows = await client.listWorkflows(ctx.input.profileId);

    let items = getAppcircleList(workflows, 'list');

    return {
      output: items,
      message: `Found **${items.length}** workflow(s) for profile **${ctx.input.profileId}**.`
    };
  })
  .build();
