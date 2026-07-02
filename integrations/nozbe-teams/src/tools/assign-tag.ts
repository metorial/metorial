import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignTag = SlateTool.create(spec, {
  name: 'Assign Tag to Task',
  key: 'assign_tag',
  description: `Assign a tag to a task or remove a tag assignment. Use to categorize tasks with context labels.`,
  instructions: [
    'To remove a tag from a task, provide the assignmentId from a previous tag assignment listing.',
    'To add a tag, provide both tagId and taskId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['assign', 'unassign']).describe('Whether to assign or unassign the tag'),
      tagId: z.string().optional().describe('Tag ID to assign (required for assign action)'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID to assign the tag to (required for assign action)'),
      assignmentId: z
        .string()
        .optional()
        .describe('Tag assignment ID to remove (required for unassign action)')
    })
  )
  .output(
    z.object({
      assignmentId: z.string().optional().describe('ID of the tag assignment'),
      tagId: z.string().optional().describe('Tag ID'),
      taskId: z.string().optional().describe('Task ID'),
      removed: z.boolean().optional().describe('Whether the assignment was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'assign') {
      if (!ctx.input.tagId || !ctx.input.taskId) {
        throw new Error('tagId and taskId are required when assigning a tag');
      }

      let assignment = await client.createTagAssignment({
        tag_id: ctx.input.tagId,
        task_id: ctx.input.taskId
      });

      return {
        output: {
          assignmentId: assignment.id,
          tagId: assignment.tag_id,
          taskId: assignment.task_id
        },
        message: `Assigned tag **${ctx.input.tagId}** to task **${ctx.input.taskId}**.`
      };
    } else {
      if (!ctx.input.assignmentId) {
        throw new Error('assignmentId is required when unassigning a tag');
      }

      await client.deleteTagAssignment(ctx.input.assignmentId);

      return {
        output: {
          assignmentId: ctx.input.assignmentId,
          removed: true
        },
        message: `Removed tag assignment **${ctx.input.assignmentId}**.`
      };
    }
  })
  .build();
