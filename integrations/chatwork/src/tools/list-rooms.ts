import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRooms = SlateTool.create(spec, {
  name: 'List Rooms',
  key: 'list_rooms',
  description: `Lists all chat rooms the authenticated user participates in. Returns room details including name, type, role, and activity counts (unread messages, mentions, tasks). Use the optional type filter to narrow results to specific room types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['my', 'direct', 'group'])
        .optional()
        .describe('Filter rooms by type: "my" (personal chat), "direct" (1-on-1), or "group"')
    })
  )
  .output(
    z.object({
      rooms: z.array(
        z.object({
          roomId: z.number().describe('Room ID'),
          name: z.string().describe('Room name'),
          type: z.string().describe('Room type: my, direct, or group'),
          role: z.string().describe('User role in the room: admin, member, or readonly'),
          sticky: z.boolean().describe('Whether the room is pinned'),
          unreadCount: z.number().describe('Unread message count'),
          mentionCount: z.number().describe('Unread mention count'),
          taskCount: z.number().describe('Assigned task count'),
          messageCount: z.number().describe('Total message count'),
          fileCount: z.number().describe('Total file count'),
          iconPath: z.string().describe('Room icon URL'),
          lastUpdateTime: z.number().describe('Last update Unix timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let rooms = await client.getRooms();

    if (ctx.input.type) {
      rooms = rooms.filter(r => r.type === ctx.input.type);
    }

    let output = {
      rooms: rooms.map(r => ({
        roomId: r.room_id,
        name: r.name,
        type: r.type,
        role: r.role,
        sticky: r.sticky,
        unreadCount: r.unread_num,
        mentionCount: r.mention_num,
        taskCount: r.mytask_num,
        messageCount: r.message_num,
        fileCount: r.file_num,
        iconPath: r.icon_path,
        lastUpdateTime: r.last_update_time
      }))
    };

    return {
      output,
      message: `Found **${output.rooms.length}** rooms${ctx.input.type ? ` of type "${ctx.input.type}"` : ''}.`
    };
  })
  .build();
