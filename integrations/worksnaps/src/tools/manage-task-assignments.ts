import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTaskAssignments = SlateTool.create(spec, {
  name: 'Manage Task Assignments',
  key: 'manage_task_assignments',
  description: `List, create, or remove task assignments within a project. Task assignments control which users are responsible for which tasks inside a project.`,
  instructions: [
    'Use action "list" to see all current task assignments for a project.',
    'Use action "create" to assign a user to a task. Requires both userId and taskId.',
    'Use action "remove" to remove an assignment by its taskAssignmentId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project'),
      action: z.enum(['list', 'create', 'remove']).describe('Action to perform'),
      taskAssignmentId: z.string().optional().describe('Assignment ID (required for remove)'),
      userId: z.number().optional().describe('User ID to assign (required for create)'),
      taskId: z
        .number()
        .optional()
        .describe('Task ID to assign the user to (required for create)')
    })
  )
  .output(
    z.object({
      assignments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of task assignments (for list action)'),
      assignment: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created task assignment'),
      removed: z.boolean().optional().describe('Whether the assignment was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, projectId, taskAssignmentId, userId, taskId } = ctx.input;

    if (action === 'list') {
      let assignments = await client.listTaskAssignments(projectId);
      return {
        output: { assignments },
        message: `Found **${assignments.length}** task assignment(s) in project **${projectId}**.`
      };
    }

    if (action === 'create') {
      if (userId === undefined || taskId === undefined) {
        throw new Error('Both userId and taskId are required for create action');
      }
      let assignment = await client.createTaskAssignment(projectId, { userId, taskId });
      return {
        output: { assignment },
        message: `Assigned user **${userId}** to task **${taskId}** in project **${projectId}**.`
      };
    }

    if (action === 'remove') {
      if (!taskAssignmentId) throw new Error('taskAssignmentId is required for remove action');
      await client.deleteTaskAssignment(projectId, taskAssignmentId);
      return {
        output: { removed: true },
        message: `Removed task assignment **${taskAssignmentId}** from project **${projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
