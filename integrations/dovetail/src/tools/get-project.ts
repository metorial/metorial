import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details of a specific research project by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      createdAt: z.string(),
      authorId: z.string().nullable().optional(),
      authorName: z.string().nullable().optional(),
      folderId: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id,
        title: project.title,
        createdAt: project.created_at,
        authorId: project.author?.id ?? null,
        authorName: project.author?.name ?? null,
        folderId: project.folder?.id ?? null
      },
      message: `Retrieved project **${project.title}**.`
    };
  })
  .build();
