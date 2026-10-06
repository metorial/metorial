import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List all configured automation workflows. Returns workflow names, triggers, and enabled status. Useful for understanding what automated actions are configured in your incident.io account.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      returnedCount: z.number().int().nonnegative(),
      workflows: z.array(
        z.object({
          workflowId: z.string(),
          name: z.string(),
          trigger: z.string().optional(),
          triggerLabel: z.string().optional(),
          state: z.string().optional(),
          enabled: z.boolean().optional(),
          runsOnIncidents: z.string().optional(),
          runsOnIncidentModes: z.array(z.string()).optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWorkflows();

    let workflows = result.workflows.map(w => ({
      workflowId: w.id,
      name: w.name,
      trigger: w.trigger.name,
      triggerLabel: w.trigger.label,
      state: w.state,
      enabled: w.state === 'active',
      runsOnIncidents: w.runs_on_incidents || undefined,
      runsOnIncidentModes: w.runs_on_incident_modes || undefined,
      createdAt: w.created_at || undefined,
      updatedAt: w.updated_at || undefined
    }));

    return {
      output: { workflows, returnedCount: workflows.length },
      message: `Found **${workflows.length}** workflow(s).`
    };
  })
  .build();
