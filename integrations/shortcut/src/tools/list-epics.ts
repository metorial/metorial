import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEpics = SlateTool.create(spec, {
  name: 'List Epics',
  key: 'list_epics',
  description: `Lists all epics in the workspace with their status, stats, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      epics: z
        .array(
          z.object({
            epicId: z.number().describe('Epic ID'),
            name: z.string().describe('Epic name'),
            appUrl: z.string().describe('URL to view in Shortcut'),
            epicStateId: z.number().describe('Epic workflow state ID'),
            archived: z.boolean().describe('Whether the epic is archived'),
            started: z.boolean().describe('Whether the epic is started'),
            completed: z.boolean().describe('Whether the epic is completed'),
            deadline: z.string().nullable().describe('Deadline timestamp'),
            ownerIds: z.array(z.string()).describe('UUIDs of epic owners'),
            objectiveIds: z.array(z.number()).describe('Linked objective IDs'),
            numStoriesTotal: z.number().describe('Total number of stories'),
            numStoriesDone: z.number().describe('Number of completed stories'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of all epics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let epics = await client.listEpics();

    let mapped = epics.map((e: any) => ({
      epicId: e.id,
      name: e.name,
      appUrl: e.app_url,
      epicStateId: e.epic_state_id,
      archived: e.archived ?? false,
      started: e.started ?? false,
      completed: e.completed ?? false,
      deadline: e.deadline ?? null,
      ownerIds: e.owner_ids || [],
      objectiveIds: e.objective_ids || [],
      numStoriesTotal: e.stats?.num_stories_total ?? 0,
      numStoriesDone: e.stats?.num_stories_done ?? 0,
      updatedAt: e.updated_at
    }));

    return {
      output: { epics: mapped },
      message: `Found **${mapped.length}** epics`
    };
  })
  .build();
