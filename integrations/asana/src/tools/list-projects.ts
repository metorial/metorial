import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in a workspace, optionally filtered by team or archived status. Returns project summaries including dates, owner, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID to list projects from'),
      teamId: z.string().optional().describe('Filter projects by team GID'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return (default 100)')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          name: z.string(),
          archived: z.boolean().optional(),
          color: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          dueOn: z.string().nullable().optional(),
          startOn: z.string().nullable().optional(),
          modifiedAt: z.string().optional(),
          defaultView: z.string().optional(),
          isPublic: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listProjects(ctx.input.workspaceId, {
      limit: ctx.input.limit,
      team: ctx.input.teamId,
      archived: ctx.input.archived
    });

    let projects = (result.data || []).map((p: any) => ({
      projectId: p.gid,
      name: p.name,
      archived: p.archived,
      color: p.color,
      createdAt: p.created_at,
      dueOn: p.due_on,
      startOn: p.start_on,
      modifiedAt: p.modified_at,
      defaultView: p.default_view,
      isPublic: p.public
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s) in the workspace.`
    };
  })
  .build();
