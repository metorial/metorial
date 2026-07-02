import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newProjects = SlateTrigger.create(spec, {
  name: 'New Projects',
  key: 'new_projects',
  description: 'Triggers when new research projects are created in the Dovetail workspace.'
})
  .input(
    z.object({
      projectId: z.string(),
      title: z.string(),
      authorId: z.string().nullable().optional(),
      authorName: z.string().nullable().optional(),
      folderId: z.string().nullable().optional(),
      createdAt: z.string()
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the new project'),
      title: z.string().describe('Title of the project'),
      authorId: z.string().nullable().optional().describe('Author user ID'),
      authorName: z.string().nullable().optional().describe('Author name'),
      folderId: z.string().nullable().optional().describe('Folder ID the project is in'),
      createdAt: z.string().describe('Project creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let state = ctx.state as { lastSeenAt?: string } | null;

      let result = await client.listProjects({
        sort: 'created_at:desc',
        limit: 50
      });

      let projects = result.data;

      let firstProject = projects[0];
      let newLastSeenAt = firstProject ? firstProject.created_at : state?.lastSeenAt;

      // On first run, don't emit events
      if (!state?.lastSeenAt) {
        return {
          inputs: [],
          updatedState: { lastSeenAt: newLastSeenAt }
        };
      }

      let newProjects = projects.filter(p => p.created_at > state!.lastSeenAt!);

      let inputs = newProjects.map(p => ({
        projectId: p.id,
        title: p.title,
        authorId: p.author?.id ?? null,
        authorName: p.author?.name ?? null,
        folderId: p.folder?.id ?? null,
        createdAt: p.created_at
      }));

      return {
        inputs,
        updatedState: { lastSeenAt: newLastSeenAt }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'project.created',
        id: ctx.input.projectId,
        output: {
          projectId: ctx.input.projectId,
          title: ctx.input.title,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          folderId: ctx.input.folderId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
