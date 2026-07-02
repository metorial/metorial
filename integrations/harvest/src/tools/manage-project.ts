import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a project in Harvest. Projects are associated with clients and can be configured with billing methods, budget types, and team assignments.`,
  instructions: [
    'For **billBy**, valid values are: "Tasks", "People", or "none".',
    'For **budgetBy**, valid values are: "project", "project_cost", "task", "task_fees", "person", "none".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectId: z.number().optional().describe('Project ID (required for update/delete)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      name: z.string().optional().describe('Project name (required for create)'),
      isBillable: z
        .boolean()
        .optional()
        .describe('Whether the project is billable (required for create)'),
      billBy: z
        .string()
        .optional()
        .describe('Billing method: "Tasks", "People", or "none" (required for create)'),
      budgetBy: z
        .string()
        .optional()
        .describe(
          'Budget method: "project", "project_cost", "task", "task_fees", "person", "none" (required for create)'
        ),
      code: z.string().optional().describe('Project code'),
      isActive: z.boolean().optional().describe('Whether the project is active'),
      isFixedFee: z.boolean().optional().describe('Whether the project is fixed-fee'),
      hourlyRate: z.number().optional().describe('Hourly rate'),
      budget: z.number().optional().describe('Budget amount'),
      budgetIsMonthly: z.boolean().optional().describe('Whether budget resets monthly'),
      notifyWhenOverBudget: z
        .boolean()
        .optional()
        .describe('Send notifications when over budget'),
      overBudgetNotificationPercentage: z
        .number()
        .optional()
        .describe('Percentage threshold for over-budget notifications'),
      fee: z.number().optional().describe('Fixed fee amount'),
      notes: z.string().optional().describe('Project notes'),
      startsOn: z.string().optional().describe('Project start date (YYYY-MM-DD)'),
      endsOn: z.string().optional().describe('Project end date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      projectId: z.number().optional().describe('ID of the project'),
      name: z.string().optional().describe('Project name'),
      code: z.string().optional().nullable().describe('Project code'),
      clientName: z.string().optional().describe('Client name'),
      isBillable: z.boolean().optional().describe('Whether billable'),
      isActive: z.boolean().optional().describe('Whether active'),
      billBy: z.string().optional().describe('Billing method'),
      budgetBy: z.string().optional().describe('Budget method'),
      budget: z.number().optional().nullable().describe('Budget amount'),
      fee: z.number().optional().nullable().describe('Fixed fee'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.projectId) throw new Error('projectId is required for delete');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { projectId: ctx.input.projectId, deleted: true },
        message: `Deleted project **#${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.clientId ||
        !ctx.input.name ||
        ctx.input.isBillable === undefined ||
        !ctx.input.billBy ||
        !ctx.input.budgetBy
      ) {
        throw new Error(
          'clientId, name, isBillable, billBy, and budgetBy are required for create'
        );
      }
      let project = await client.createProject({
        clientId: ctx.input.clientId,
        name: ctx.input.name,
        isBillable: ctx.input.isBillable,
        billBy: ctx.input.billBy,
        budgetBy: ctx.input.budgetBy,
        code: ctx.input.code,
        isActive: ctx.input.isActive,
        isFixedFee: ctx.input.isFixedFee,
        hourlyRate: ctx.input.hourlyRate,
        budget: ctx.input.budget,
        budgetIsMonthly: ctx.input.budgetIsMonthly,
        notifyWhenOverBudget: ctx.input.notifyWhenOverBudget,
        overBudgetNotificationPercentage: ctx.input.overBudgetNotificationPercentage,
        fee: ctx.input.fee,
        notes: ctx.input.notes,
        startsOn: ctx.input.startsOn,
        endsOn: ctx.input.endsOn
      });
      return {
        output: {
          projectId: project.id,
          name: project.name,
          code: project.code,
          clientName: project.client?.name,
          isBillable: project.is_billable,
          isActive: project.is_active,
          billBy: project.bill_by,
          budgetBy: project.budget_by,
          budget: project.budget,
          fee: project.fee
        },
        message: `Created project **${project.name}** (#${project.id}).`
      };
    }

    // update
    if (!ctx.input.projectId) throw new Error('projectId is required for update');
    let project = await client.updateProject(ctx.input.projectId, {
      clientId: ctx.input.clientId,
      name: ctx.input.name,
      isBillable: ctx.input.isBillable,
      billBy: ctx.input.billBy,
      budgetBy: ctx.input.budgetBy,
      code: ctx.input.code,
      isActive: ctx.input.isActive,
      isFixedFee: ctx.input.isFixedFee,
      hourlyRate: ctx.input.hourlyRate,
      budget: ctx.input.budget,
      budgetIsMonthly: ctx.input.budgetIsMonthly,
      notifyWhenOverBudget: ctx.input.notifyWhenOverBudget,
      overBudgetNotificationPercentage: ctx.input.overBudgetNotificationPercentage,
      fee: ctx.input.fee,
      notes: ctx.input.notes,
      startsOn: ctx.input.startsOn,
      endsOn: ctx.input.endsOn
    });
    return {
      output: {
        projectId: project.id,
        name: project.name,
        code: project.code,
        clientName: project.client?.name,
        isBillable: project.is_billable,
        isActive: project.is_active,
        billBy: project.bill_by,
        budgetBy: project.budget_by,
        budget: project.budget,
        fee: project.fee
      },
      message: `Updated project **${project.name}** (#${project.id}).`
    };
  })
  .build();
