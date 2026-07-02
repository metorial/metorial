import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

export let newProjectTrigger = SlateTrigger.create(spec, {
  name: 'New Project',
  key: 'new_project',
  description: 'Triggers when a new project is created in Nozbe Teams.'
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().describe('Project name'),
      teamId: z.string().optional().describe('Team ID'),
      description: z.string().nullable().optional().describe('Project description'),
      isOpen: z.boolean().optional().describe('Whether the project is open'),
      createdAt: z.number().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().describe('Project name'),
      teamId: z.string().optional().describe('Team ID'),
      description: z.string().nullable().optional().describe('Project description'),
      isOpen: z.boolean().optional().describe('Whether the project is open'),
      createdAt: z.number().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let params: ListParams = {
        sortBy: '-created_at',
        limit: 50
      };

      let lastPollTimestamp = ctx.state?.lastPollTimestamp as number | undefined;
      if (lastPollTimestamp) {
        params['created_at[min]'] = lastPollTimestamp + 1;
      }

      let projects = await client.listProjects(params);

      let newTimestamp = lastPollTimestamp;
      if (projects.length > 0) {
        newTimestamp = Math.max(...projects.map((p: any) => p.created_at || 0));
      }

      return {
        inputs: projects.map((p: any) => ({
          projectId: p.id,
          name: p.name,
          teamId: p.team_id,
          description: p.description,
          isOpen: p.is_open,
          createdAt: p.created_at
        })),
        updatedState: {
          lastPollTimestamp: newTimestamp ?? Date.now()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'project.created',
        id: ctx.input.projectId,
        output: {
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          teamId: ctx.input.teamId,
          description: ctx.input.description,
          isOpen: ctx.input.isOpen,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
