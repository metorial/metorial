import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTagAssignments = SlateTool.create(spec, {
  name: 'List Tag Assignments',
  key: 'list_tag_assignments',
  description:
    'List tag assignments, optionally filtered by task or tag. Use an assignment ID with assign_tag to remove an existing tag from a task.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Filter assignments by task ID'),
      tagId: z.string().optional().describe('Filter assignments by tag ID'),
      sortBy: z.string().optional().describe('Comma-separated sort fields'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum assignments to return'),
      offset: z.number().int().min(0).optional().describe('Number of assignments to skip')
    })
  )
  .output(
    z.object({
      assignments: z.array(
        z.object({
          assignmentId: z.string().describe('Assignment ID for removing the tag'),
          taskId: z.string().describe('Task ID'),
          tagId: z.string().describe('Tag ID')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let assignments = await new Client({ token: ctx.auth.token }).listTagAssignments({
      task_id: ctx.input.taskId,
      tag_id: ctx.input.tagId,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let mapped = assignments.map(
      (assignment: { id: string; task_id: string; tag_id: string }) => ({
        assignmentId: assignment.id,
        taskId: assignment.task_id,
        tagId: assignment.tag_id
      })
    );
    return {
      output: { assignments: mapped },
      message: `Found **${mapped.length}** tag assignment(s).`
    };
  })
  .build();
