import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let leaveOrDeleteRoom = SlateTool.create(spec, {
  name: 'Leave or Delete Room',
  key: 'leave_or_delete_room',
  description: `Leaves or permanently deletes a chat room. **Leaving** removes your tasks and files from the room. **Deleting** permanently removes all messages, tasks, and files for all members (irreversible).`,
  constraints: ['Deleting a room is irreversible and removes all content for all members.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      action: z
        .enum(['leave', 'delete'])
        .describe('"leave" to leave the room, "delete" to permanently delete it')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    await client.deleteRoom(ctx.input.roomId, ctx.input.action);

    return {
      output: { success: true },
      message:
        ctx.input.action === 'delete'
          ? `Permanently deleted room ${ctx.input.roomId}.`
          : `Left room ${ctx.input.roomId}.`
    };
  })
  .build();
