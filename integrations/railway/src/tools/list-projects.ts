import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Railway projects accessible to the authenticated user. Optionally filter by workspace. Returns project names, descriptions, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Filter projects by workspace ID. Omit to list all accessible projects.')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          name: z.string().describe('Project name'),
          description: z.string().nullable().describe('Project description'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let projects = await client.listProjects(ctx.input.workspaceId);

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
