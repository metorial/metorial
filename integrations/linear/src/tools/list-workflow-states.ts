import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkflowStatesTool = SlateTool.create(spec, {
  name: 'List Workflow States',
  key: 'list_workflow_states',
  description: `Lists workflow states (issue statuses) across teams. Workflow states define the lifecycle of issues (e.g., Triage, Backlog, Todo, In Progress, Done, Canceled). Use this to find state IDs for creating or updating issues.`,
  instructions: [
    'State types are: triage, backlog, unstarted, started, completed, canceled.',
    'Each team can have its own set of workflow states.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter by team ID'),
      first: z.number().optional().describe('Number of states to return (default: 250)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      workflowStates: z.array(
        z.object({
          stateId: z.string().describe('Workflow state ID'),
          name: z.string().describe('State name'),
          type: z
            .string()
            .describe('State type (triage, backlog, unstarted, started, completed, canceled)'),
          color: z.string().describe('State color'),
          position: z.number().describe('Display position'),
          teamId: z.string().describe('Team ID'),
          teamName: z.string().describe('Team name'),
          teamKey: z.string().describe('Team key')
        })
      ),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listWorkflowStates({
      teamId: ctx.input.teamId,
      first: ctx.input.first,
      after: ctx.input.after
    });

    let states = (result.nodes || []).map((s: any) => ({
      stateId: s.id,
      name: s.name,
      type: s.type,
      color: s.color,
      position: s.position,
      teamId: s.team?.id || '',
      teamName: s.team?.name || '',
      teamKey: s.team?.key || ''
    }));

    return {
      output: {
        workflowStates: states,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${states.length}** workflow states`
    };
  })
  .build();
