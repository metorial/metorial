import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEpic = SlateTool.create(spec, {
  name: 'Get Epic',
  key: 'get_epic',
  description: `Retrieves full details of an epic by its ID, including description, stats, labels, owners, linked objectives, and workflow state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      epicId: z.number().describe('ID of the epic to retrieve')
    })
  )
  .output(
    z.object({
      epicId: z.number().describe('ID of the epic'),
      name: z.string().describe('Name of the epic'),
      description: z.string().describe('Description of the epic'),
      appUrl: z.string().describe('URL to view in Shortcut'),
      epicStateId: z.number().describe('Current epic workflow state ID'),
      archived: z.boolean().describe('Whether the epic is archived'),
      started: z.boolean().describe('Whether the epic is started'),
      completed: z.boolean().describe('Whether the epic is completed'),
      ownerIds: z.array(z.string()).describe('UUIDs of epic owners'),
      followerIds: z.array(z.string()).describe('UUIDs of epic followers'),
      groupIds: z.array(z.string()).describe('UUIDs of assigned teams/groups'),
      objectiveIds: z.array(z.number()).describe('Linked objective IDs'),
      labels: z
        .array(
          z.object({
            labelId: z.number().describe('Label ID'),
            name: z.string().describe('Label name')
          })
        )
        .describe('Labels on this epic'),
      deadline: z.string().nullable().describe('Deadline timestamp'),
      plannedStartDate: z.string().nullable().describe('Planned start date'),
      stats: z
        .object({
          numStoriesTotal: z.number().describe('Total number of stories'),
          numStoriesStarted: z.number().describe('Number of started stories'),
          numStoriesDone: z.number().describe('Number of completed stories'),
          numStoriesUnstarted: z.number().describe('Number of unstarted stories'),
          numPointsTotal: z.number().describe('Total points'),
          numPointsDone: z.number().describe('Completed points')
        })
        .describe('Epic statistics'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let epic = await client.getEpic(ctx.input.epicId);

    return {
      output: {
        epicId: epic.id,
        name: epic.name,
        description: epic.description || '',
        appUrl: epic.app_url,
        epicStateId: epic.epic_state_id,
        archived: epic.archived,
        started: epic.started,
        completed: epic.completed,
        ownerIds: epic.owner_ids || [],
        followerIds: epic.follower_ids || [],
        groupIds: epic.group_ids || [],
        objectiveIds: epic.objective_ids || [],
        labels: (epic.labels || []).map((l: any) => ({
          labelId: l.id,
          name: l.name
        })),
        deadline: epic.deadline ?? null,
        plannedStartDate: epic.planned_start_date ?? null,
        stats: {
          numStoriesTotal: epic.stats?.num_stories_total ?? 0,
          numStoriesStarted: epic.stats?.num_stories_started ?? 0,
          numStoriesDone: epic.stats?.num_stories_done ?? 0,
          numStoriesUnstarted: epic.stats?.num_stories_unstarted ?? 0,
          numPointsTotal: epic.stats?.num_points ?? 0,
          numPointsDone: epic.stats?.num_points_done ?? 0
        },
        createdAt: epic.created_at,
        updatedAt: epic.updated_at
      },
      message: `Retrieved epic **${epic.name}** (ID: ${epic.id}) — [View in Shortcut](${epic.app_url})`
    };
  })
  .build();
