import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listObjectives = SlateTool.create(spec, {
  name: 'List Objectives',
  key: 'list_objectives',
  description: `Lists all objectives (formerly milestones) in the workspace. Objectives are top-level strategic goals that epics can be linked to.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      objectives: z
        .array(
          z.object({
            objectiveId: z.number().describe('Objective ID'),
            name: z.string().describe('Objective name'),
            appUrl: z.string().describe('URL to view in Shortcut'),
            state: z.string().describe('Current state: to do, in progress, or done'),
            archived: z.boolean().describe('Whether the objective is archived'),
            numEpicsTotal: z.number().describe('Total number of epics'),
            numEpicsDone: z.number().describe('Number of completed epics'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of all objectives')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectives = await client.listObjectives();

    let mapped = objectives.map((obj: any) => ({
      objectiveId: obj.id,
      name: obj.name,
      appUrl: obj.app_url,
      state: obj.state,
      archived: obj.archived ?? false,
      numEpicsTotal: obj.stats?.num_epics_total ?? obj.num_epics_total ?? 0,
      numEpicsDone: obj.stats?.num_epics_done ?? obj.num_epics_done ?? 0,
      createdAt: obj.created_at
    }));

    return {
      output: { objectives: mapped },
      message: `Found **${mapped.length}** objectives`
    };
  })
  .build();
