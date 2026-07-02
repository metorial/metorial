import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newProjectTrigger = SlateTrigger.create(spec, {
  name: 'New Project',
  key: 'new_project',
  description: 'Triggers when a new project is created in Agiled.'
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      project: z.record(z.string(), z.unknown()).describe('Project record from Agiled')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the new project'),
      name: z.string().optional().describe('Project name'),
      status: z.string().optional().describe('Project status'),
      clientId: z.string().optional().describe('Associated client ID'),
      deadline: z.string().optional().describe('Project deadline'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listProjects(1, 50);
      let projects = result.data;

      let newProjects = lastKnownId ? projects.filter(p => Number(p.id) > lastKnownId) : [];

      let maxId = projects.reduce(
        (max, p) => Math.max(max, Number(p.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newProjects.map(p => ({
          projectId: String(p.id),
          project: p
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.project;
      return {
        type: 'project.created',
        id: ctx.input.projectId,
        output: {
          projectId: ctx.input.projectId,
          name: p.project_name as string | undefined,
          status: p.status as string | undefined,
          clientId: p.client_id != null ? String(p.client_id) : undefined,
          deadline: p.deadline as string | undefined,
          createdAt: p.created_at as string | undefined
        }
      };
    }
  })
  .build();
