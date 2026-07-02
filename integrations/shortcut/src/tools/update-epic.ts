import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEpic = SlateTool.create(spec, {
  name: 'Update Epic',
  key: 'update_epic',
  description: `Updates an existing epic's attributes including name, description, state, owners, teams, objectives, labels, deadlines, and archived status. Pass \`null\` to unset optional fields like deadline or planned start date.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      epicId: z.number().describe('ID of the epic to update'),
      name: z.string().optional().describe('New name for the epic'),
      description: z.string().optional().describe('New description in Markdown'),
      epicStateId: z.number().optional().describe('New epic workflow state ID'),
      ownerIds: z
        .array(z.string())
        .optional()
        .describe('UUIDs of new owners (replaces existing)'),
      followerIds: z
        .array(z.string())
        .optional()
        .describe('UUIDs of new followers (replaces existing)'),
      groupIds: z.array(z.string()).optional().describe('UUIDs of teams/groups'),
      objectiveIds: z.array(z.number()).optional().describe('Objective IDs to link'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to set (replaces existing)'),
      deadline: z
        .string()
        .optional()
        .nullable()
        .describe('Deadline in ISO 8601 format (null to unset)'),
      plannedStartDate: z
        .string()
        .optional()
        .nullable()
        .describe('Planned start date (null to unset)'),
      archived: z.boolean().optional().describe('Whether the epic should be archived')
    })
  )
  .output(
    z.object({
      epicId: z.number().describe('ID of the updated epic'),
      name: z.string().describe('Updated name'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      epicStateId: z.number().describe('Updated epic workflow state ID'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {};

    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.epicStateId !== undefined) params.epic_state_id = ctx.input.epicStateId;
    if (ctx.input.ownerIds !== undefined) params.owner_ids = ctx.input.ownerIds;
    if (ctx.input.followerIds !== undefined) params.follower_ids = ctx.input.followerIds;
    if (ctx.input.groupIds !== undefined) params.group_ids = ctx.input.groupIds;
    if (ctx.input.objectiveIds !== undefined) params.objective_ids = ctx.input.objectiveIds;
    if (ctx.input.deadline !== undefined) params.deadline = ctx.input.deadline;
    if (ctx.input.plannedStartDate !== undefined)
      params.planned_start_date = ctx.input.plannedStartDate;
    if (ctx.input.archived !== undefined) params.archived = ctx.input.archived;

    if (ctx.input.labels) {
      params.labels = ctx.input.labels.map(l => ({ name: l.name }));
    }

    let epic = await client.updateEpic(ctx.input.epicId, params);

    return {
      output: {
        epicId: epic.id,
        name: epic.name,
        appUrl: epic.app_url,
        epicStateId: epic.epic_state_id,
        updatedAt: epic.updated_at
      },
      message: `Updated epic **${epic.name}** (ID: ${epic.id}) — [View in Shortcut](${epic.app_url})`
    };
  })
  .build();
