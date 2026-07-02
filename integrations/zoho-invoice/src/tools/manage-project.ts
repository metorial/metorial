import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Creates or updates a project in Zoho Invoice. If projectId is provided, the existing project is updated; otherwise a new project is created. Projects can be linked to a customer and configured with billing type, rate, and budget settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('ID of the project to update. If omitted, a new project is created.'),
      projectName: z
        .string()
        .optional()
        .describe('Name of the project (required when creating)'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to associate with the project (required when creating)'),
      description: z.string().optional().describe('Description of the project'),
      billingType: z
        .enum([
          'based_on_project_hours',
          'based_on_task_hours',
          'based_on_staff_hours',
          'fixed_cost_for_project'
        ])
        .optional()
        .describe('How the project is billed'),
      rate: z.number().optional().describe('Hourly rate or fixed cost for the project'),
      budgetType: z
        .enum([
          'total_project_cost',
          'total_project_hours',
          'hours_per_task',
          'hours_per_staff'
        ])
        .optional()
        .describe('Type of budget tracking'),
      budgetHours: z.number().optional().describe('Budget hours for the project'),
      budgetAmount: z.number().optional().describe('Budget amount for the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique ID of the project'),
      projectName: z.string().optional().describe('Name of the project'),
      customerId: z.string().optional().describe('Associated customer ID'),
      customerName: z.string().optional().describe('Associated customer name'),
      description: z.string().optional().describe('Project description'),
      status: z.string().optional().describe('Current status of the project'),
      billingType: z.string().optional().describe('Billing type of the project'),
      rate: z.number().optional().describe('Hourly rate or fixed cost'),
      totalHours: z.string().optional().describe('Total logged hours'),
      billableHours: z.string().optional().describe('Total billable hours'),
      billedHours: z.string().optional().describe('Total billed hours'),
      unbilledHours: z.string().optional().describe('Total unbilled hours'),
      createdTime: z.string().optional().describe('Timestamp when the project was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('Timestamp when the project was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let payload: Record<string, any> = {};

    if (ctx.input.projectName) payload.project_name = ctx.input.projectName;
    if (ctx.input.customerId) payload.customer_id = ctx.input.customerId;
    if (ctx.input.description) payload.description = ctx.input.description;
    if (ctx.input.billingType) payload.billing_type = ctx.input.billingType;
    if (ctx.input.rate !== undefined) payload.rate = ctx.input.rate;
    if (ctx.input.budgetType) payload.budget_type = ctx.input.budgetType;
    if (ctx.input.budgetHours !== undefined) payload.budget_hours = ctx.input.budgetHours;
    if (ctx.input.budgetAmount !== undefined) payload.budget_amount = ctx.input.budgetAmount;

    let project: any;

    if (ctx.input.projectId) {
      project = await client.updateProject(ctx.input.projectId, payload);
    } else {
      project = await client.createProject(payload);
    }

    let output = {
      projectId: project.project_id,
      projectName: project.project_name,
      customerId: project.customer_id,
      customerName: project.customer_name,
      description: project.description,
      status: project.status,
      billingType: project.billing_type,
      rate: project.rate,
      totalHours: project.total_hours,
      billableHours: project.billable_hours,
      billedHours: project.billed_hours,
      unbilledHours: project.un_billed_hours,
      createdTime: project.created_time,
      lastModifiedTime: project.last_modified_time
    };

    let action = ctx.input.projectId ? 'Updated' : 'Created';

    return {
      output,
      message: `${action} project **${output.projectName}** (${output.projectId}).`
    };
  })
  .build();
