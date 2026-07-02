import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z
  .object({
    projectId: z.number().describe('Unique project ID'),
    name: z.string().optional().describe('Project name'),
    number: z.string().optional().describe('Project number'),
    status: z.string().optional().describe('Project status reference'),
    projectType: z.string().optional().describe('Project type reference'),
    location: z.string().optional().describe('Project location'),
    inDate: z.string().optional().describe('Equipment usage start date'),
    outDate: z.string().optional().describe('Equipment usage end date'),
    planPeriodFrom: z.string().optional().describe('Planning period start'),
    planPeriodTo: z.string().optional().describe('Planning period end'),
    contact: z.string().optional().describe('Contact reference'),
    memo: z.string().optional().describe('Project memo / notes'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .describe('Rentman project');

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve a list of projects from Rentman. Supports pagination, sorting, and field selection. Use this to browse rental projects or find specific ones by filtering.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Number of results to skip for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Sort field with + (asc) or - (desc) prefix, e.g. "+name" or "-created"'),
      fields: z.string().optional().describe('Comma-separated list of fields to return')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema),
      itemCount: z.number().describe('Total number of items matching the query'),
      limit: z.number().describe('Applied limit'),
      offset: z.number().describe('Applied offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('projects', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let projects = result.data.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      number: p.number,
      status: p.status,
      projectType: p.project_type,
      location: p.location,
      inDate: p.equipment_period_from || p.in,
      outDate: p.equipment_period_to || p.out,
      planPeriodFrom: p.planperiod_start,
      planPeriodTo: p.planperiod_end,
      contact: p.contact,
      memo: p.memo,
      createdAt: p.created,
      updatedAt: p.modified
    }));

    return {
      output: {
        projects,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** projects. Returned ${projects.length} projects (offset: ${result.offset}).`
    };
  })
  .build();
