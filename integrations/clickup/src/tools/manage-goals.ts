import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getGoals = SlateTool.create(spec, {
  name: 'Get Goals',
  key: 'get_goals',
  description: `Retrieve all goals from the workspace. Optionally include completed goals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeCompleted: z.boolean().optional().describe('Include completed goals in results')
    })
  )
  .output(
    z.object({
      goals: z.array(
        z.object({
          goalId: z.string(),
          goalName: z.string(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          percentCompleted: z.number().optional(),
          color: z.string().optional(),
          ownerIds: z.array(z.string()).optional(),
          keyResultCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let goals = await client.getGoals(ctx.config.workspaceId, ctx.input.includeCompleted);

    return {
      output: {
        goals: (goals ?? []).map((g: any) => ({
          goalId: g.id,
          goalName: g.name,
          description: g.description,
          dueDate: g.due_date,
          percentCompleted: g.percent_completed,
          color: g.color,
          ownerIds: g.owners?.map((o: any) => String(o.id)) ?? [],
          keyResultCount: g.key_results?.length
        }))
      },
      message: `Found **${(goals ?? []).length}** goal(s).`
    };
  })
  .build();

export let createGoal = SlateTool.create(spec, {
  name: 'Create Goal',
  key: 'create_goal',
  description: `Create a new goal (objective) in the ClickUp workspace. Goals track progress through key results.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the goal'),
      description: z.string().optional().describe('Description of the goal'),
      dueDate: z.string().optional().describe('Due date as Unix timestamp in milliseconds'),
      owners: z.array(z.number()).optional().describe('User IDs of goal owners'),
      color: z.string().optional().describe('Goal color hex code')
    })
  )
  .output(
    z.object({
      goalId: z.string(),
      goalName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let goal = await client.createGoal(ctx.config.workspaceId, {
      name: ctx.input.name,
      description: ctx.input.description,
      dueDate: ctx.input.dueDate ? Number(ctx.input.dueDate) : undefined,
      owners: ctx.input.owners,
      color: ctx.input.color,
      multipleOwners: ctx.input.owners && ctx.input.owners.length > 1
    });

    return {
      output: {
        goalId: goal.id,
        goalName: goal.name
      },
      message: `Created goal **${goal.name}** (${goal.id}).`
    };
  })
  .build();

export let updateGoal = SlateTool.create(spec, {
  name: 'Update Goal',
  key: 'update_goal',
  description: `Update an existing ClickUp goal's name, description, due date, color, or owners.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      goalId: z.string().describe('The goal ID to update'),
      name: z.string().optional().describe('New name for the goal'),
      description: z.string().optional().describe('New description'),
      dueDate: z.string().optional().describe('Due date as Unix timestamp in milliseconds'),
      color: z.string().optional().describe('Goal color hex code'),
      addOwners: z.array(z.number()).optional().describe('User IDs to add as owners'),
      removeOwners: z.array(z.number()).optional().describe('User IDs to remove from owners')
    })
  )
  .output(
    z.object({
      goalId: z.string(),
      goalName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let goal = await client.updateGoal(ctx.input.goalId, {
      name: ctx.input.name,
      description: ctx.input.description,
      dueDate: ctx.input.dueDate ? Number(ctx.input.dueDate) : undefined,
      color: ctx.input.color,
      addOwners: ctx.input.addOwners,
      remOwners: ctx.input.removeOwners
    });

    return {
      output: {
        goalId: goal.id,
        goalName: goal.name
      },
      message: `Updated goal **${goal.name}** (${goal.id}).`
    };
  })
  .build();

export let deleteGoal = SlateTool.create(spec, {
  name: 'Delete Goal',
  key: 'delete_goal',
  description: `Permanently delete a ClickUp goal. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      goalId: z.string().describe('The goal ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteGoal(ctx.input.goalId);

    return {
      output: { deleted: true },
      message: `Deleted goal ${ctx.input.goalId}.`
    };
  })
  .build();
