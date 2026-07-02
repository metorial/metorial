import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchProjects = SlateTool.create(spec, {
  name: 'Search Projects',
  key: 'search_projects',
  description: `Search and filter projects using advanced query operators. Supports filtering by name, status, project code, resources, date ranges, and custom fields.
Use operators like **$in**, **$nin**, **$like**, **$lt**, **$lte**, **$gte** for flexible querying.`,
  instructions: [
    'Pass filters as key-value pairs where values can be simple strings or operator objects like { "$in": ["STATUS_ACTIVE"] }.',
    'Use "$like" for partial string matching on name or projectCode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z
        .any()
        .optional()
        .describe(
          'Filter by project name. String or operator object (e.g. { "$like": "Marketing" })'
        ),
      status: z
        .any()
        .optional()
        .describe(
          'Filter by status. String or operator (e.g. { "$in": ["STATUS_ACTIVE", "STATUS_PLANNED"] })'
        ),
      projectCode: z.any().optional().describe('Filter by project code'),
      resources: z.any().optional().describe('Filter by resource IDs assigned to projects'),
      start: z
        .any()
        .optional()
        .describe('Filter by start date with operators like $gte, $lte'),
      end: z.any().optional().describe('Filter by end date with operators like $gte, $lte'),
      metadata: z.any().optional().describe('Filter by metadata field')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project ID'),
            name: z.string().optional().describe('Project name'),
            projectCode: z.string().optional().describe('Project code'),
            status: z.string().optional().describe('Project status'),
            start: z.string().optional().describe('Start date'),
            end: z.string().optional().describe('End date'),
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filters: Record<string, any> = {};

    if (ctx.input.name !== undefined) filters.name = ctx.input.name;
    if (ctx.input.status !== undefined) filters.status = ctx.input.status;
    if (ctx.input.projectCode !== undefined) filters.projectCode = ctx.input.projectCode;
    if (ctx.input.resources !== undefined) filters.resources = ctx.input.resources;
    if (ctx.input.start !== undefined) filters.start = ctx.input.start;
    if (ctx.input.end !== undefined) filters.end = ctx.input.end;
    if (ctx.input.metadata !== undefined) filters.metadata = ctx.input.metadata;

    let projects = await client.searchProjects(filters);
    return {
      output: {
        projects: projects.map((p: any) => ({
          projectId: p._id,
          name: p.name,
          projectCode: p.projectCode,
          status: p.status,
          start: p.start,
          end: p.end,
          metadata: p.metadata,
          createdDate: p.createdDate,
          updatedDate: p.updatedDate
        }))
      },
      message: `Found **${projects.length}** projects matching the search criteria.`
    };
  })
  .build();
