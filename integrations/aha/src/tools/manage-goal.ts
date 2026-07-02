import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let goalOutputSchema = z.object({
  goalId: z.string().optional().describe('Goal ID'),
  referenceNum: z.string().optional().describe('Goal reference number'),
  name: z.string().optional().describe('Goal name'),
  description: z.string().optional().describe('Goal description'),
  status: z.string().optional().describe('Workflow status name'),
  progress: z.number().optional().describe('Progress percentage'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the goal was deleted')
});

export let manageGoal = SlateTool.create(spec, {
  name: 'Manage Goal',
  key: 'manage_goal',
  description: `Create, update, or delete a strategic goal in Aha!. Goals define measurable outcomes and can have key results (OKRs). They connect strategy to the product roadmap.`,
  instructions: [
    'To **create** a goal, set action to "create" and provide a productId plus at least a name.',
    'To **update** a goal, set action to "update" and provide the goalId plus the fields to change.',
    'To **delete** a goal, set action to "delete" and provide the goalId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      goalId: z
        .string()
        .optional()
        .describe('Goal ID or reference number (required for update/delete)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID or reference prefix (required for create)'),
      name: z.string().optional().describe('Goal name'),
      description: z.string().optional().describe('Goal description (HTML supported)')
    })
  )
  .output(goalOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId) throw new Error('productId is required to create a goal');
      if (!ctx.input.name) throw new Error('name is required to create a goal');

      let goal = await client.createGoal(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          goalId: goal.id,
          referenceNum: goal.reference_num,
          name: goal.name,
          description: goal.description,
          status: goal.workflow_status?.name,
          progress: goal.progress,
          url: goal.url,
          createdAt: goal.created_at,
          updatedAt: goal.updated_at
        },
        message: `Created goal **${goal.reference_num}** — ${goal.name}.`
      };
    }

    if (!ctx.input.goalId) throw new Error('goalId is required for this action');

    if (action === 'delete') {
      await client.deleteGoal(ctx.input.goalId);
      return {
        output: { goalId: ctx.input.goalId, deleted: true },
        message: `Deleted goal \`${ctx.input.goalId}\`.`
      };
    }

    // update
    let goal = await client.updateGoal(ctx.input.goalId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        goalId: goal.id,
        referenceNum: goal.reference_num,
        name: goal.name,
        description: goal.description,
        status: goal.workflow_status?.name,
        progress: goal.progress,
        url: goal.url,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at
      },
      message: `Updated goal **${goal.reference_num}** — ${goal.name}.`
    };
  })
  .build();
