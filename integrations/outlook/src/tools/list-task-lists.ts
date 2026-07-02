import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTaskLists = SlateTool.create(spec, {
  name: 'List Task Lists',
  key: 'list_task_lists',
  description: `List all Microsoft To Do task lists for the authenticated user. Returns the list name, ID, ownership, and sharing status. Task lists organize tasks by category or purpose.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      taskLists: z.array(
        z.object({
          taskListId: z.string(),
          displayName: z.string(),
          isOwner: z.boolean().optional(),
          isShared: z.boolean().optional(),
          wellknownListName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTaskLists();

    let taskLists = result.value.map(l => ({
      taskListId: l.id,
      displayName: l.displayName,
      isOwner: l.isOwner,
      isShared: l.isShared,
      wellknownListName: l.wellknownListName
    }));

    return {
      output: { taskLists },
      message: `Found **${taskLists.length}** task list(s).`
    };
  })
  .build();
