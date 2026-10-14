import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve a single project by ID, or list all projects with optional pagination.
Returns full project details including name, status, dates, budget, resources, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Specific project ID to retrieve. If omitted, lists all projects.'),
      page: z.number().min(0).optional().describe('Page number for pagination (0-based)'),
      limit: z.number().min(1).max(1000).optional().describe('Number of projects per page')
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
            note: z.string().optional().describe('Project notes'),
            budgetHours: z.number().optional().describe('Budget hours'),
            budgetCashAmount: z.number().optional().describe('Budget cash amount'),
            budgetCurrency: z.string().optional().describe('Budget currency'),
            resources: z.array(z.string()).optional().describe('Assigned resource IDs'),
            projectManagers: z
              .array(z.string())
              .optional()
              .describe('Project manager resource IDs'),
            customFields: z.array(z.any()).optional().describe('Project custom fields'),
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.page !== undefined && !Number.isInteger(ctx.input.page)) {
      throw createApiServiceError('page must be a whole number starting at 0.');
    }
    if (ctx.input.limit !== undefined && !Number.isInteger(ctx.input.limit)) {
      throw createApiServiceError('limit must be a whole number between 1 and 1000.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.projectId) {
      let project = await client.getProject(ctx.input.projectId);
      return {
        output: {
          projects: [
            {
              projectId: project._id,
              name: project.name ?? undefined,
              projectCode: project.projectCode ?? undefined,
              status: project.status ?? undefined,
              start: project.start ?? undefined,
              end: project.end ?? undefined,
              note: project.note ?? undefined,
              budgetHours: project.budgetHours ?? undefined,
              budgetCashAmount: project.budgetCashAmount ?? undefined,
              budgetCurrency: project.budgetCurrency ?? undefined,
              resources: project.resources ?? undefined,
              projectManagers: project.projectManagers ?? undefined,
              customFields: project.customFields ?? undefined,
              metadata: project.metadata ?? undefined,
              createdDate: project.createdDate ?? undefined,
              updatedDate: project.updatedDate ?? undefined
            }
          ]
        },
        message: `Retrieved project **${project.name}** (ID: \`${project._id}\`).`
      };
    }

    let projects = await client.getProjects(ctx.input.page, ctx.input.limit);
    return {
      output: {
        projects: projects.map((p: any) => ({
          projectId: p._id,
          name: p.name ?? undefined,
          projectCode: p.projectCode ?? undefined,
          status: p.status ?? undefined,
          start: p.start ?? undefined,
          end: p.end ?? undefined,
          note: p.note ?? undefined,
          budgetHours: p.budgetHours ?? undefined,
          budgetCashAmount: p.budgetCashAmount ?? undefined,
          budgetCurrency: p.budgetCurrency ?? undefined,
          resources: p.resources ?? undefined,
          projectManagers: p.projectManagers ?? undefined,
          customFields: p.customFields ?? undefined,
          metadata: p.metadata ?? undefined,
          createdDate: p.createdDate ?? undefined,
          updatedDate: p.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${projects.length}** projects.`
    };
  })
  .build();
