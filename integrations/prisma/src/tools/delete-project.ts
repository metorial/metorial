import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { projectIdInput } from '../lib/schemas';
import { spec } from '../spec';

export const deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description:
    'Permanently delete a Prisma project and its resources. Discover the project with list_projects and verify ownership before deletion.',
  constraints: [
    'This operation destroys the project and its databases. Only delete a project you intend to permanently remove.'
  ],
  tags: { destructive: true }
})
  .input(z.object({ projectId: projectIdInput }))
  .output(z.object({ projectId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new PrismaClient(ctx.auth.token).deleteProject(ctx.input.projectId);
    return {
      output: { projectId: ctx.input.projectId, deleted: true },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();
