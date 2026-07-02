import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Project ID'),
  name: z.string().describe('Project name'),
  description: z.string().nullable().describe('Project description'),
  color: z.string().nullable().describe('Color hex code'),
  active: z.boolean().describe('Whether the project is active'),
  billable: z.boolean().describe('Whether the project is billable'),
  clientId: z.number().nullable().describe('Associated client ID'),
  clientName: z.string().nullable().describe('Associated client name'),
  hourRate: z.number().nullable().describe('Hourly rate'),
  rateType: z.string().nullable().describe('Rate type (project or user)'),
  budget: z.number().nullable().describe('Budget amount'),
  budgetType: z.string().nullable().describe('Budget type (hours, money, etc.)'),
  budgetPercent: z.number().nullable().describe('Budget usage percentage'),
  teamIds: z.array(z.number()).describe('Assigned team IDs'),
  labelIds: z.array(z.number()).describe('Associated label IDs'),
  externalId: z.string().nullable().describe('External reference ID')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve projects from Timely. Filter by status (active, archived, all, mine). Includes client, budget, and rate information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .enum(['active', 'all', 'mine', 'archived'])
        .optional()
        .describe('Project filter'),
      limit: z.number().optional().describe('Max projects to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema),
      count: z.number().describe('Number of projects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let projects = await client.listProjects({
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order
    });

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? null,
      color: p.color ?? null,
      active: p.active ?? true,
      billable: p.billable ?? true,
      clientId: p.client?.id ?? null,
      clientName: p.client?.name ?? null,
      hourRate: p.hour_rate ?? null,
      rateType: p.rate_type ?? null,
      budget: p.budget ?? null,
      budgetType: p.budget_type || null,
      budgetPercent: p.budget_percent ?? null,
      teamIds: p.team_ids ?? [],
      labelIds: p.label_ids ?? [],
      externalId: p.external_id ?? null
    }));

    return {
      output: { projects: mapped, count: mapped.length },
      message: `Found **${mapped.length}** projects.`
    };
  })
  .build();
