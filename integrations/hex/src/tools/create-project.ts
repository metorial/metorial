import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new Hex project in the workspace with a title and optional description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title for the new project'),
      description: z.string().optional().describe('Description for the new project')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let project = await client.createProject(ctx.input.title, ctx.input.description);

    return {
      output: {
        projectId: project.projectId,
        title: project.title,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      message: `Created project **${project.title}** (${project.projectId}).`
    };
  })
  .build();
