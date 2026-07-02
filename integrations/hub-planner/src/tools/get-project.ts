import { SlateTool } from 'slates';
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
      page: z.number().optional().describe('Page number for pagination (0-based)'),
      limit: z.number().optional().describe('Number of projects per page')
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
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.projectId) {
      let project = await client.getProject(ctx.input.projectId);
      return {
        output: {
          projects: [
            {
              projectId: project._id,
              name: project.name,
              projectCode: project.projectCode,
              status: project.status,
              start: project.start,
              end: project.end,
              note: project.note,
              budgetHours: project.budgetHours,
              budgetCashAmount: project.budgetCashAmount,
              budgetCurrency: project.budgetCurrency,
              metadata: project.metadata,
              createdDate: project.createdDate,
              updatedDate: project.updatedDate
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
          name: p.name,
          projectCode: p.projectCode,
          status: p.status,
          start: p.start,
          end: p.end,
          note: p.note,
          budgetHours: p.budgetHours,
          budgetCashAmount: p.budgetCashAmount,
          budgetCurrency: p.budgetCurrency,
          metadata: p.metadata,
          createdDate: p.createdDate,
          updatedDate: p.updatedDate
        }))
      },
      message: `Retrieved **${projects.length}** projects.`
    };
  })
  .build();
