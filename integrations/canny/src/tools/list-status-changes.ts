import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listStatusChangesTool = SlateTool.create(spec, {
  name: 'List Status Changes',
  key: 'list_status_changes',
  description: `List the history of post status changes across your boards. Shows who changed each status, the old and new values, and when the change occurred.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().optional().describe('Filter by board ID'),
      limit: z.number().optional().describe('Number of status changes to return (max 100)'),
      skip: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      statusChanges: z
        .array(
          z.object({
            statusChangeId: z.string().describe('Status change ID'),
            postId: z.string().describe('Post ID'),
            postTitle: z.string().describe('Post title'),
            oldStatus: z.string().describe('Previous status'),
            newStatus: z.string().describe('New status'),
            changerName: z.string().describe('Name of the user who changed the status'),
            changerId: z.string().describe('ID of the user who changed the status'),
            created: z.string().describe('Timestamp of the change')
          })
        )
        .describe('List of status changes'),
      hasMore: z.boolean().describe('Whether more changes are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listStatusChanges({
      boardID: ctx.input.boardId,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let statusChanges = (result.statusChanges || []).map((sc: any) => ({
      statusChangeId: sc.id,
      postId: sc.post?.id,
      postTitle: sc.post?.title,
      oldStatus: sc.oldStatus,
      newStatus: sc.newStatus,
      changerName: sc.changer?.name,
      changerId: sc.changer?.id,
      created: sc.created
    }));

    return {
      output: { statusChanges, hasMore: result.hasMore },
      message: `Found **${statusChanges.length}** status change(s)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
