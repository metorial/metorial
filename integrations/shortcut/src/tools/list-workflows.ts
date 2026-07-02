import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `Lists all workflows and their states in the workspace. Workflows define the progression of stories through states (e.g., Unstarted → In Progress → Done). Use this to look up workflow state IDs needed for creating or updating stories.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.number().describe('Workflow ID'),
            name: z.string().describe('Workflow name'),
            teamId: z.string().describe('UUID of the team this workflow belongs to'),
            defaultStateId: z.number().describe('Default state ID for new stories'),
            states: z
              .array(
                z.object({
                  stateId: z.number().describe('Workflow state ID'),
                  name: z.string().describe('State name'),
                  type: z.string().describe('State type: unstarted, started, or done'),
                  position: z.number().describe('Position in the workflow')
                })
              )
              .describe('Ordered list of workflow states')
          })
        )
        .describe('List of all workflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let workflows = await client.listWorkflows();

    let mapped = workflows.map((wf: any) => ({
      workflowId: wf.id,
      name: wf.name,
      teamId: wf.team_id || '',
      defaultStateId: wf.default_state_id,
      states: (wf.states || []).map((s: any) => ({
        stateId: s.id,
        name: s.name,
        type: s.type,
        position: s.position
      }))
    }));

    return {
      output: { workflows: mapped },
      message: `Found **${mapped.length}** workflows with their states`
    };
  })
  .build();
