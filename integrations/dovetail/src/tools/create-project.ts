import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new research project in Dovetail. Projects are the primary organizational unit for grouping related notes, data, and insights.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Project title (max 200 characters)')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      createdAt: z.string(),
      authorId: z.string().nullable().optional(),
      authorName: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.createProject(ctx.input.title);

    return {
      output: {
        projectId: project.id,
        title: project.title,
        createdAt: project.created_at,
        authorId: project.author?.id ?? null,
        authorName: project.author?.name ?? null
      },
      message: `Created project **${project.title}** (ID: ${project.id}).`
    };
  })
  .build();
