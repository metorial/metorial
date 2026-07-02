import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the Workato workspace. Projects are top-level containers for organizing recipes, connections, and other assets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Project ID'),
          name: z.string().describe('Project name'),
          description: z.string().nullable().describe('Project description'),
          folderId: z.number().nullable().describe('Root folder ID of the project')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listProjects({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = Array.isArray(result) ? result : (result.items ?? []);
    let projects = items.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? null,
      folderId: p.folder_id ?? null
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** projects.`
    };
  });
