import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the workspace. Projects are used to organize maps into collections.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Workspace ID to filter projects (optional)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            name: z.string().nullable().describe('Project name'),
            visibility: z.string().nullable().describe('Visibility level'),
            maxInheritedPermission: z
              .string()
              .nullable()
              .describe('Maximum inherited permission')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let projects = await client.listProjects(ctx.input.workspaceId);

    let mapped = (Array.isArray(projects) ? projects : []).map((p: any) => ({
      projectId: p.id,
      name: p.name ?? null,
      visibility: p.visibility ?? null,
      maxInheritedPermission: p.max_inherited_permission ?? null
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
