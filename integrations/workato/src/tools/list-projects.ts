import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { records } from '../lib/validation';
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
          projectId: z.number().optional().describe('Project ID'),
          name: z.string().optional().describe('Project name'),
          description: z.string().nullable().optional().describe('Project description'),
          folderId: z.number().nullable().optional().describe('Root folder ID of the project')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listProjects(ctx.input);
    const projects = records(result.items).map(map.project);
    return {
      output: { projects },
      message: `Returned ${projects.length} projects from this page.`
    };
  });
