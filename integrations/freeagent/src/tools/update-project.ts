import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in FreeAgent. Only the provided fields will be changed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The FreeAgent project ID to update'),
      name: z.string().optional().describe('Project name'),
      contactId: z.string().optional().describe('Contact ID'),
      budgetUnits: z
        .enum(['Hours', 'Days', 'Monetary'])
        .optional()
        .describe('Budget unit type'),
      budget: z.string().optional().describe('Budget amount'),
      status: z
        .enum(['Active', 'Completed', 'Cancelled', 'Hidden'])
        .optional()
        .describe('Project status'),
      startsOn: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endsOn: z.string().optional().describe('End date in YYYY-MM-DD format'),
      normalBillingRate: z.string().optional().describe('Normal billing rate')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.any()).describe('The updated project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let projectData: Record<string, any> = {};
    if (ctx.input.name) projectData.name = ctx.input.name;
    if (ctx.input.contactId) projectData.contact = ctx.input.contactId;
    if (ctx.input.budgetUnits) projectData.budget_units = ctx.input.budgetUnits;
    if (ctx.input.budget) projectData.budget = ctx.input.budget;
    if (ctx.input.status) projectData.status = ctx.input.status;
    if (ctx.input.startsOn) projectData.starts_on = ctx.input.startsOn;
    if (ctx.input.endsOn) projectData.ends_on = ctx.input.endsOn;
    if (ctx.input.normalBillingRate)
      projectData.normal_billing_rate = ctx.input.normalBillingRate;

    let project = await client.updateProject(ctx.input.projectId, projectData);

    return {
      output: { project: project || {} },
      message: `Updated project **${ctx.input.projectId}**`
    };
  })
  .build();
