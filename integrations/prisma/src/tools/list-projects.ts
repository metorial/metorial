import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { paginationInput, paginationOutput } from '../lib/schemas';
import { spec } from '../spec';

export const listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'Discover accessible Prisma projects with their IDs, names, workspace, and default region. Use these project IDs when managing databases.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInput))
  .output(
    z.object({
      ...paginationOutput,
      projects: z.array(
        z.object({
          projectId: z.string(),
          projectName: z.string(),
          workspaceId: z.string().optional(),
          workspaceName: z.string().optional(),
          defaultRegion: z.string().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const page = await new PrismaClient(ctx.auth.token).listProjects(ctx.input);
    return {
      output: {
        projects: page.data.map(project => ({
          projectId: project.id,
          projectName: project.name,
          workspaceId: project.workspace?.id,
          workspaceName: project.workspace?.name,
          defaultRegion: project.defaultRegion ?? undefined,
          createdAt: project.createdAt
        })),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore
      },
      message: `Found **${page.data.length}** project(s).`
    };
  })
  .build();
