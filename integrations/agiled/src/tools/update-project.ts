import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Agiled. Change the name, deadlines, budget, status, or other project details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated project name'),
      summary: z.string().optional().describe('Updated project summary'),
      notes: z.string().optional().describe('Updated project notes'),
      startDate: z.string().optional().describe('Updated start date (YYYY-MM-DD)'),
      deadline: z.string().optional().describe('Updated deadline (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Updated client ID'),
      budget: z.number().optional().describe('Updated budget amount'),
      status: z.string().optional().describe('Updated project status')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the updated project'),
      name: z.string().optional().describe('Updated project name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.project_name = ctx.input.name;
    if (ctx.input.summary !== undefined) updateData.project_summary = ctx.input.summary;
    if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
    if (ctx.input.startDate !== undefined) updateData.start_date = ctx.input.startDate;
    if (ctx.input.deadline !== undefined) updateData.deadline = ctx.input.deadline;
    if (ctx.input.clientId !== undefined) updateData.client_id = ctx.input.clientId;
    if (ctx.input.budget !== undefined) updateData.project_budget = ctx.input.budget;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;

    let result = await client.updateProject(ctx.input.projectId, updateData);
    let project = result.data;

    return {
      output: {
        projectId: String(project.id ?? ctx.input.projectId),
        name: project.project_name as string | undefined
      },
      message: `Updated project **${ctx.input.projectId}**.`
    };
  })
  .build();
