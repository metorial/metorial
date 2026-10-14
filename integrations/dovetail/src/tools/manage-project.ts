import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description:
    'Update a research project title or delete a project. Call list_projects to discover the project ID. Deleted projects are moved to trash and can be restored within 30 days.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('Operation to perform.'),
      projectId: projectIdSchema,
      title: z
        .string()
        .max(200)
        .optional()
        .describe('New project title (required for update).')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      createdAt: z.string(),
      deleted: z.boolean(),
      folderId: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.action === 'update' && ctx.input.title === undefined) {
      throw createApiServiceError('Provide a title to update the project.');
    }
    let project =
      ctx.input.action === 'update' && ctx.input.title !== undefined
        ? await client.updateProject(ctx.input.projectId, ctx.input.title)
        : await client.deleteProject(ctx.input.projectId);
    return {
      output: {
        projectId: project.id,
        title: project.title,
        createdAt: project.created_at,
        deleted: project.deleted,
        folderId: project.folder?.id ?? null
      },
      message: `${ctx.input.action === 'delete' ? 'Deleted' : 'Updated'} project **${project.title}**.`
    };
  })
  .build();
