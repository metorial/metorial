import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique identifier of the project'),
  name: z.string().describe('Name of the project'),
  regionId: z.string().describe('Region where the project is hosted'),
  pgVersion: z.number().describe('PostgreSQL version number'),
  createdAt: z.string().describe('Timestamp when the project was created'),
  updatedAt: z.string().describe('Timestamp when the project was last updated'),
  platformId: z.string().optional().describe('Platform identifier'),
  orgId: z.string().optional().describe('Organization the project belongs to')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Lists all Neon projects accessible to the authenticated user. Supports searching by name or ID and filtering by organization. Returns project metadata including region, Postgres version, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter projects by name or ID'),
      orgId: z.string().optional().describe('Organization ID to filter projects by'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return (1-400, default 10)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching next page of results')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });

    let result = await client.listProjects({
      search: ctx.input.search,
      orgId: ctx.input.orgId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      regionId: p.region_id,
      pgVersion: p.pg_version,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      platformId: p.platform_id,
      orgId: p.org_id
    }));

    return {
      output: {
        projects,
        cursor: result.pagination?.cursor
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
