import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEpic = SlateTool.create(spec, {
  name: 'Create Epic',
  key: 'create_epic',
  description: `Creates a new epic in Shortcut. Epics represent larger bodies of work or features composed of multiple stories. They can be assigned to teams, objectives, and have their own workflow states and deadlines.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the epic (max 256 characters)'),
      description: z
        .string()
        .optional()
        .describe('Description in Markdown (max 100,000 characters)'),
      epicStateId: z.number().optional().describe('Epic workflow state ID'),
      ownerIds: z.array(z.string()).optional().describe('UUIDs of epic owners'),
      followerIds: z.array(z.string()).optional().describe('UUIDs of epic followers'),
      groupIds: z.array(z.string()).optional().describe('UUIDs of teams/groups'),
      objectiveIds: z
        .array(z.number())
        .optional()
        .describe('Objective IDs to link this epic to'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to apply'),
      deadline: z.string().optional().nullable().describe('Deadline in ISO 8601 format'),
      plannedStartDate: z
        .string()
        .optional()
        .nullable()
        .describe('Planned start date in ISO 8601 format'),
      externalId: z.string().optional().describe('External identifier')
    })
  )
  .output(
    z.object({
      epicId: z.number().describe('ID of the created epic'),
      name: z.string().describe('Name of the epic'),
      appUrl: z.string().describe('URL to view the epic in Shortcut'),
      epicStateId: z.number().describe('Current epic workflow state ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.epicStateId !== undefined) params.epic_state_id = ctx.input.epicStateId;
    if (ctx.input.ownerIds !== undefined) params.owner_ids = ctx.input.ownerIds;
    if (ctx.input.followerIds !== undefined) params.follower_ids = ctx.input.followerIds;
    if (ctx.input.groupIds !== undefined) params.group_ids = ctx.input.groupIds;
    if (ctx.input.objectiveIds !== undefined) params.objective_ids = ctx.input.objectiveIds;
    if (ctx.input.deadline !== undefined) params.deadline = ctx.input.deadline;
    if (ctx.input.plannedStartDate !== undefined)
      params.planned_start_date = ctx.input.plannedStartDate;
    if (ctx.input.externalId !== undefined) params.external_id = ctx.input.externalId;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    let epic = await client.createEpic(params);

    return {
      output: {
        epicId: epic.id,
        name: epic.name,
        appUrl: epic.app_url,
        epicStateId: epic.epic_state_id,
        createdAt: epic.created_at
      },
      message: `Created epic **${epic.name}** (ID: ${epic.id}) — [View in Shortcut](${epic.app_url})`
    };
  })
  .build();
