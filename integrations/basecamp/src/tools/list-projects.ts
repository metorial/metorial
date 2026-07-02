import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique identifier of the project'),
  name: z.string().describe('Name of the project'),
  description: z.string().nullable().describe('Description of the project'),
  status: z.string().describe('Status of the project (active, archived, trashed)'),
  createdAt: z.string().describe('When the project was created'),
  updatedAt: z.string().describe('When the project was last updated'),
  bookmarked: z.boolean().describe('Whether the project is bookmarked'),
  purpose: z.string().nullable().describe('Purpose of the project')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your Basecamp account. Returns active projects by default; optionally filter by status to see archived or trashed projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'archived', 'trashed'])
        .optional()
        .default('active')
        .describe('Filter projects by status')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let statusParam = ctx.input.status === 'active' ? undefined : ctx.input.status;
    let projects = await client.listProjects({ status: statusParam });

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? null,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      bookmarked: p.bookmarked ?? false,
      purpose: p.purpose ?? null
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** ${ctx.input.status ?? 'active'} project(s).`
    };
  })
  .build();
