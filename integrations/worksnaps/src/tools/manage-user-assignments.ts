import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserAssignments = SlateTool.create(spec, {
  name: 'Manage User Assignments',
  key: 'manage_user_assignments',
  description: `List, create, update, or remove user assignments within a project. User assignments control which users can access a project and define their role (Manager, Member, or Observer) and settings like hourly rate and time logging permissions.`,
  instructions: [
    'Use action "list" to see all current user assignments for a project.',
    'Use action "create" to assign a user to a project. Requires userId.',
    'Use action "update" to modify an existing assignment. Requires userAssignmentId.',
    'Use action "remove" to unassign a user from a project. Requires userAssignmentId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project'),
      action: z.enum(['list', 'create', 'update', 'remove']).describe('Action to perform'),
      userAssignmentId: z
        .string()
        .optional()
        .describe('Assignment ID (required for update/remove)'),
      userId: z.number().optional().describe('User ID to assign (required for create)'),
      role: z.string().optional().describe('Role: "Manager", "Member", or "Observer"'),
      hourlyRate: z.number().optional().describe('Hourly rate for the user in this project'),
      allowLoggingTime: z.boolean().optional().describe('Whether the user can log time'),
      windowForDeletingTime: z
        .number()
        .optional()
        .describe('Days allowed for deleting time (-1=unlimited, 0=none, 1-30=days)'),
      windowForAddingOfflineTime: z
        .number()
        .optional()
        .describe('Days allowed for adding offline time (-1=unlimited, 0=none, 1-30=days)')
    })
  )
  .output(
    z.object({
      assignments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of user assignments (for list action)'),
      assignment: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created or updated user assignment'),
      removed: z.boolean().optional().describe('Whether the assignment was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let {
      action,
      projectId,
      userAssignmentId,
      userId,
      role,
      hourlyRate,
      allowLoggingTime,
      windowForDeletingTime,
      windowForAddingOfflineTime
    } = ctx.input;

    if (action === 'list') {
      let assignments = await client.listUserAssignments(projectId);
      return {
        output: { assignments },
        message: `Found **${assignments.length}** user assignment(s) in project **${projectId}**.`
      };
    }

    if (action === 'create') {
      let assignment = await client.createUserAssignment(projectId, {
        userId,
        role,
        hourlyRate,
        flagAllowLoggingTime:
          allowLoggingTime !== undefined ? (allowLoggingTime ? 1 : 0) : undefined,
        windowForDeletingTime,
        windowForAddingOfflineTime
      });
      return {
        output: { assignment },
        message: `Assigned user **${userId}** to project **${projectId}**.`
      };
    }

    if (action === 'update') {
      if (!userAssignmentId) throw new Error('userAssignmentId is required for update action');
      let assignment = await client.updateUserAssignment(projectId, userAssignmentId, {
        hourlyRate,
        flagAllowLoggingTime:
          allowLoggingTime !== undefined ? (allowLoggingTime ? 1 : 0) : undefined,
        windowForDeletingTime,
        windowForAddingOfflineTime
      });
      return {
        output: { assignment },
        message: `Updated user assignment **${userAssignmentId}** in project **${projectId}**.`
      };
    }

    if (action === 'remove') {
      if (!userAssignmentId) throw new Error('userAssignmentId is required for remove action');
      await client.deleteUserAssignment(projectId, userAssignmentId);
      return {
        output: { removed: true },
        message: `Removed user assignment **${userAssignmentId}** from project **${projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
