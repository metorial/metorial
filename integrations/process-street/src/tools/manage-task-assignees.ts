import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let assigneeSchema = z.object({
  email: z.string().describe('Email address of the assignee'),
  username: z.string().optional().describe('Username of the assignee')
});

export let manageTaskAssignees = SlateTool.create(spec, {
  name: 'Manage Task Assignees',
  key: 'manage_task_assignees',
  description: `Assign or unassign users to/from tasks or workflow runs. Can also list current assignees. Works for both individual tasks and entire workflow runs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run'),
      taskId: z
        .string()
        .optional()
        .describe('ID of the specific task (omit to manage workflow run assignees)'),
      action: z.enum(['list', 'assign', 'unassign']).describe('Action to perform'),
      email: z
        .string()
        .optional()
        .describe('Email of the user to assign or unassign (required for assign/unassign)')
    })
  )
  .output(
    z.object({
      assignees: z
        .array(assigneeSchema)
        .optional()
        .describe('List of current assignees (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { workflowRunId, taskId, action, email } = ctx.input;

    if (action === 'list') {
      let data: any;
      if (taskId) {
        data = await client.listTaskAssignees(workflowRunId, taskId);
      } else {
        data = await client.listWorkflowRunAssignees(workflowRunId);
      }
      let assignees = (data.assignees || []).map((a: any) => ({
        email: a.email,
        username: a.username
      }));
      return {
        output: { assignees, success: true },
        message: `Found **${assignees.length}** assignee(s).`
      };
    }

    if (!email) {
      throw new Error('Email is required for assign/unassign actions');
    }

    if (action === 'assign') {
      if (taskId) {
        await client.assignUserToTask(workflowRunId, taskId, email);
      } else {
        await client.assignUserToWorkflowRun(workflowRunId, email);
      }
      return {
        output: { success: true },
        message: `Assigned **${email}** to ${taskId ? `task ${taskId}` : `workflow run ${workflowRunId}`}.`
      };
    }

    if (taskId) {
      await client.unassignUserFromTask(workflowRunId, taskId, email);
    } else {
      await client.unassignUserFromWorkflowRun(workflowRunId, email);
    }
    return {
      output: { success: true },
      message: `Unassigned **${email}** from ${taskId ? `task ${taskId}` : `workflow run ${workflowRunId}`}.`
    };
  })
  .build();
