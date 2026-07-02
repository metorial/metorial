import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGoals = SlateTool.create(spec, {
  name: 'Get Employee Goals',
  key: 'get_goals',
  description: `Retrieve goals for a specific employee. Optionally filter by status. Returns goal details including title, description, progress, due date, and sharing information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      filter: z.enum(['all', 'open', 'closed']).optional().describe('Filter goals by status')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      goals: z.array(z.record(z.string(), z.any())).describe('List of goals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getGoals(ctx.input.employeeId, ctx.input.filter);
    let goals = data?.goals || (Array.isArray(data) ? data : []);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        goals
      },
      message: `Found **${goals.length}** goal(s) for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

export let createGoal = SlateTool.create(spec, {
  name: 'Create Goal',
  key: 'create_goal',
  description: `Create a new goal for an employee. Specify a title and optionally a description, due date, initial progress, alignment, and sharing with other employees.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      title: z.string().describe('Goal title'),
      description: z.string().optional().describe('Goal description'),
      percentComplete: z.number().optional().describe('Initial progress percentage (0-100)'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      sharedWithEmployeeIds: z
        .array(z.string())
        .optional()
        .describe('Employee IDs to share this goal with'),
      alignsWithOptionId: z
        .string()
        .optional()
        .describe('ID of the organizational objective to align with')
    })
  )
  .output(
    z.object({
      goalId: z.string().describe('The created goal ID'),
      employeeId: z.string().describe('The employee ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let result = await client.createGoal(ctx.input.employeeId, {
      title: ctx.input.title,
      description: ctx.input.description,
      percentComplete: ctx.input.percentComplete,
      dueDate: ctx.input.dueDate,
      sharedWithEmployeeIds: ctx.input.sharedWithEmployeeIds,
      alignsWithOptionId: ctx.input.alignsWithOptionId
    });

    return {
      output: {
        goalId: String(result?.goal?.id || result?.id || 'unknown'),
        employeeId: ctx.input.employeeId
      },
      message: `Created goal **${ctx.input.title}** for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

export let updateGoal = SlateTool.create(spec, {
  name: 'Update Goal',
  key: 'update_goal',
  description: `Update an existing goal. Can change title, description, progress, due date, sharing, or close/reopen the goal. To close or reopen a goal, use the **action** field.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      goalId: z.string().describe('The goal ID to update'),
      action: z
        .enum(['update', 'close', 'reopen'])
        .default('update')
        .describe('Action to perform on the goal'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      percentComplete: z.number().optional().describe('Updated progress percentage (0-100)'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      sharedWithEmployeeIds: z
        .array(z.string())
        .optional()
        .describe('Updated list of employee IDs to share with')
    })
  )
  .output(
    z.object({
      goalId: z.string().describe('The goal ID'),
      employeeId: z.string().describe('The employee ID'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    if (ctx.input.action === 'close') {
      await client.closeGoal(ctx.input.employeeId, ctx.input.goalId);
    } else if (ctx.input.action === 'reopen') {
      await client.reopenGoal(ctx.input.employeeId, ctx.input.goalId);
    } else {
      let updateData: Record<string, any> = {};
      if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.percentComplete !== undefined)
        updateData.percentComplete = ctx.input.percentComplete;
      if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
      if (ctx.input.sharedWithEmployeeIds !== undefined)
        updateData.sharedWithEmployeeIds = ctx.input.sharedWithEmployeeIds;
      await client.updateGoal(ctx.input.employeeId, ctx.input.goalId, updateData);
    }

    return {
      output: {
        goalId: ctx.input.goalId,
        employeeId: ctx.input.employeeId,
        action: ctx.input.action
      },
      message: `Goal **${ctx.input.goalId}** for employee **${ctx.input.employeeId}** has been ${ctx.input.action === 'close' ? 'closed' : ctx.input.action === 'reopen' ? 'reopened' : 'updated'}.`
    };
  })
  .build();

export let addGoalComment = SlateTool.create(spec, {
  name: 'Add Goal Comment',
  key: 'add_goal_comment',
  description: `Add a comment to an existing employee goal. Useful for providing feedback, status updates, or discussion on goal progress.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      goalId: z.string().describe('The goal ID'),
      text: z.string().describe('Comment text')
    })
  )
  .output(
    z.object({
      goalId: z.string().describe('The goal ID'),
      employeeId: z.string().describe('The employee ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    await client.addGoalComment(ctx.input.employeeId, ctx.input.goalId, ctx.input.text);

    return {
      output: {
        goalId: ctx.input.goalId,
        employeeId: ctx.input.employeeId
      },
      message: `Added comment to goal **${ctx.input.goalId}** for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();
