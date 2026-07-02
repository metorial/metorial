import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces accessible to the authenticated user. Workspaces are organizational containers for projects and databases on the Prisma Data Platform.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z
        .array(
          z.object({
            workspaceId: z.string().describe('Unique workspace identifier'),
            displayName: z.string().optional().describe('Human-readable workspace name'),
            slug: z.string().optional().describe('URL-friendly workspace slug'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp of when the workspace was created')
          })
        )
        .describe('List of accessible workspaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let workspaces = await client.listWorkspaces();

    let mapped = workspaces.map(w => ({
      workspaceId: w.id,
      displayName: w.displayName ?? w.name,
      slug: w.slug,
      createdAt: w.createdAt
    }));

    return {
      output: { workspaces: mapped },
      message: `Found **${mapped.length}** workspace(s).`
    };
  })
  .build();
