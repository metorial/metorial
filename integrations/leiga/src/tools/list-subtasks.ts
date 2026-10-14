import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubtasksTool = SlateTool.create(spec, {
  name: 'List Subtasks',
  key: 'list_subtasks',
  description:
    "List an issue's subtasks with their IDs, assignees, dates, estimates, and completion state. Use the returned IDs with update_subtask or delete_subtask.",
  tags: { readOnly: true }
})
  .input(
    z.object({
      issueId: z.number().describe('Parent issue ID from get_issue or query_issues')
    })
  )
  .output(
    z.object({
      issueId: z.number(),
      subtasks: z
        .array(z.any())
        .describe('Subtask details including stable IDs and done flags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listSubtasks(ctx.input.issueId);
    let subtasks = response.data ?? [];
    return {
      output: { issueId: ctx.input.issueId, subtasks },
      message: `Found ${subtasks.length} subtasks for issue #${ctx.input.issueId}.`
    };
  })
  .build();
