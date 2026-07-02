import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newProject = SlateTrigger.create(spec, {
  name: 'New Project',
  key: 'new_project',
  description: 'Triggers when a new project is created in the Hex workspace.'
})
  .input(
    z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string().nullable(),
      categories: z.array(z.string()),
      creatorEmail: z.string().nullable(),
      createdAt: z.string()
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('UUID of the new project'),
      title: z.string().describe('Title of the new project'),
      description: z.string().nullable().describe('Description of the new project'),
      status: z.string().nullable().describe('Status of the new project'),
      categories: z.array(z.string()).describe('Categories of the new project'),
      creatorEmail: z.string().nullable().describe('Email of the project creator'),
      createdAt: z.string().describe('When the project was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let state = ctx.state as { lastSeenCreatedAt?: string } | null;
      let lastSeenCreatedAt = state?.lastSeenCreatedAt ?? null;

      let result = await client.listProjects({
        limit: 50,
        sortBy: 'CREATED_AT',
        sortDirection: 'DESC'
      });

      let projects = result.values ?? [];
      let newProjects = lastSeenCreatedAt
        ? projects.filter(p => p.createdAt > lastSeenCreatedAt)
        : [];

      let newLastSeen = projects.length > 0 ? projects[0]!.createdAt : lastSeenCreatedAt;

      let inputs = newProjects.map(p => ({
        projectId: p.projectId,
        title: p.title,
        description: p.description,
        status: p.status,
        categories: p.categories ?? [],
        creatorEmail: p.creator?.email ?? null,
        createdAt: p.createdAt
      }));

      return {
        inputs,
        updatedState: { lastSeenCreatedAt: newLastSeen }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'project.created',
        id: ctx.input.projectId,
        output: {
          projectId: ctx.input.projectId,
          title: ctx.input.title,
          description: ctx.input.description,
          status: ctx.input.status,
          categories: ctx.input.categories,
          creatorEmail: ctx.input.creatorEmail,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
