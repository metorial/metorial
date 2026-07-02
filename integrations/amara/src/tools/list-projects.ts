import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects within a team. Projects organize videos and may have task workflows enabled.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of projects'),
      projects: z.array(
        z.object({
          name: z.string().describe('Project name'),
          projectSlug: z.string().describe('Project slug'),
          description: z.string().describe('Project description'),
          guidelines: z.string().describe('Project guidelines'),
          workflowEnabled: z.boolean().describe('Whether task workflow is enabled'),
          created: z.string().describe('Creation date'),
          modified: z.string().describe('Last modified date')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listProjects(ctx.input.teamSlug, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let projects = result.objects.map(p => ({
      name: p.name,
      projectSlug: p.slug,
      description: p.description,
      guidelines: p.guidelines,
      workflowEnabled: p.workflow_enabled,
      created: p.created,
      modified: p.modified
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        projects
      },
      message: `Found **${result.meta.total_count}** project(s) in team \`${ctx.input.teamSlug}\`.`
    };
  })
  .build();
