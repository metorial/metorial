import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, responseId } from '../lib/contracts';
import { spec } from '../spec';

export let getGoals = SlateTool.create(spec, {
  name: 'Get Employee Goals',
  key: 'get_goals',
  description: `Retrieve up to 50 visible goals for an employee. all includes closed goals, open selects goals in progress, and closed selects closed goals. With no filter, BambooHR excludes closed goals. A full page is not proof of completeness.`,
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
    let client = clientFor(ctx);

    let data = await client.getGoals(ctx.input.employeeId, ctx.input.filter);
    let goals = data.goals;

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
  description: `Create a simple goal for an employee. Supply title and dueDate. Sharing defaults to the owner and must include the owner if explicitly supplied. Progress must be an integer from 0 to 100.`,
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
      dueDate: z
        .string()
        .optional()
        .describe('Required by BambooHR: due date in YYYY-MM-DD format'),
      completionDate: z
        .string()
        .optional()
        .describe(
          'Completion date in YYYY-MM-DD format; allowed only with percentComplete=100'
        ),
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
    let client = clientFor(ctx);

    let result = await client.createGoal(ctx.input.employeeId, {
      title: ctx.input.title,
      description: ctx.input.description,
      percentComplete: ctx.input.percentComplete,
      dueDate: ctx.input.dueDate,
      completionDate: ctx.input.completionDate,
      sharedWithEmployeeIds: ctx.input.sharedWithEmployeeIds,
      alignsWithOptionId: ctx.input.alignsWithOptionId
    });

    return {
      output: {
        goalId: responseId(result.goal.id),
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
      completionDate: z
        .string()
        .optional()
        .describe(
          'Completion date in YYYY-MM-DD format; allowed only with percentComplete=100'
        ),
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
    let client = clientFor(ctx);

    if (ctx.input.action === 'close') {
      if (
        [
          'title',
          'description',
          'percentComplete',
          'dueDate',
          'sharedWithEmployeeIds',
          'completionDate'
        ].some(key => Object.hasOwn(ctx.input, key))
      )
        invalid('Close/reopen actions do not accept update fields.');
      await client.closeGoal(ctx.input.employeeId, ctx.input.goalId);
    } else if (ctx.input.action === 'reopen') {
      if (
        [
          'title',
          'description',
          'percentComplete',
          'dueDate',
          'sharedWithEmployeeIds',
          'completionDate'
        ].some(key => Object.hasOwn(ctx.input, key))
      )
        invalid('Close/reopen actions do not accept update fields.');
      await client.reopenGoal(ctx.input.employeeId, ctx.input.goalId);
    } else {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.percentComplete !== undefined)
        updateData.percentComplete = ctx.input.percentComplete;
      if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
      if (ctx.input.completionDate !== undefined)
        updateData.completionDate = ctx.input.completionDate;
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
      employeeId: z.string().describe('The employee ID'),
      commentId: z.string().optional().describe('Provider-assigned comment ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    const result = await client.addGoalComment(
      ctx.input.employeeId,
      ctx.input.goalId,
      ctx.input.text
    );

    return {
      output: {
        goalId: ctx.input.goalId,
        employeeId: ctx.input.employeeId,
        commentId: responseId(result.id)
      },
      message: `Added comment to goal **${ctx.input.goalId}** for employee **${ctx.input.employeeId}**.`
    };
  })
  .build();
