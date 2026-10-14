import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve a Basin project by ID. Call list_projects to discover accessible projects.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .number()
        .describe('Project ID. Call list_projects to discover accessible IDs.')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID.'),
      name: z.string().describe('Project name.'),
      createdAt: z.string().describe('Creation timestamp.'),
      updatedAt: z.string().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let project = await client.getProject(ctx.input.projectId);
    return {
      output: {
        projectId: project.id,
        name: project.name ?? '',
        createdAt: project.created_at ?? '',
        updatedAt: project.updated_at ?? ''
      },
      message: `Retrieved project **${project.name ?? project.id}** (ID: ${project.id}).`
    };
  })
  .build();
