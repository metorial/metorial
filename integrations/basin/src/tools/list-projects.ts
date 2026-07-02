import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in your Basin account. Projects are used to organize and group forms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      query: z.string().optional().describe('Search by project ID or name.')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Project ID.'),
          name: z.string().describe('Project name.'),
          createdAt: z.string().describe('Project creation timestamp.'),
          updatedAt: z.string().describe('Project last updated timestamp.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listProjects({
      page: ctx.input.page,
      query: ctx.input.query
    });

    let items = Array.isArray(data) ? data : (data?.items ?? data?.projects ?? []);

    let projects = items.map((p: any) => ({
      projectId: p.id,
      name: p.name ?? '',
      createdAt: p.created_at ?? '',
      updatedAt: p.updated_at ?? ''
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
