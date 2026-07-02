import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List all workflows in the Wrike account. Workflows define the set of statuses available for tasks and projects. Each workflow contains custom statuses with names, colors, and groups (Active, Completed, Deferred, Cancelled).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string(),
          name: z.string(),
          standard: z.boolean(),
          hidden: z.boolean(),
          customStatuses: z.array(
            z.object({
              statusId: z.string(),
              name: z.string(),
              color: z.string(),
              group: z.string(),
              hidden: z.boolean()
            })
          )
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getWorkflows();

    let workflows = result.data.map(w => ({
      workflowId: w.id,
      name: w.name,
      standard: w.standard,
      hidden: w.hidden,
      customStatuses: w.customStatuses.map(s => ({
        statusId: s.id,
        name: s.name,
        color: s.color,
        group: s.group,
        hidden: s.hidden
      }))
    }));

    return {
      output: { workflows, count: workflows.length },
      message: `Found **${workflows.length}** workflow(s).`
    };
  })
  .build();
