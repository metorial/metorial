import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the dbt Cloud account. Returns project names, IDs, repository info, and connection details. Use this to discover available projects before performing operations on specific ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      limit: z.number().optional().describe('Maximum number of projects to return (max 100)'),
      offset: z.number().optional().describe('Number of projects to skip for pagination'),
      orderBy: z
        .string()
        .optional()
        .describe('Field to order results by (prefix with - for descending, e.g., "-id")'),
      nameContains: z.string().optional().describe('Case-insensitive project name filter'),
      state: z
        .enum(['active', 'deleted', 'all'])
        .optional()
        .describe('Filter by soft deletion state'),
      includeRelated: z
        .array(
          z.enum([
            'repository',
            'connection',
            'group_permissions',
            'docs_job',
            'freshness_job'
          ])
        )
        .optional()
        .describe('Related resources to include in each project response')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Unique project identifier'),
            name: z.string().describe('Project name'),
            accountId: z.number().describe('Account the project belongs to'),
            connectionId: z
              .number()
              .nullable()
              .optional()
              .describe('Associated connection ID'),
            repositoryId: z
              .number()
              .nullable()
              .optional()
              .describe('Associated repository ID'),
            state: z.number().optional().describe('Project state (1 = active, 2 = deleted)'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let projects = await client.listProjects({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order_by: ctx.input.orderBy,
      name__icontains: ctx.input.nameContains,
      state: ctx.input.state,
      include_related: ctx.input.includeRelated?.join(',')
    });

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      accountId: p.account_id,
      connectionId: p.connection_id ?? null,
      repositoryId: p.repository_id ?? null,
      state: p.state,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
