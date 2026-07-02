import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getRoom = SlateTool.create(spec, {
  name: 'Get Room Details',
  key: 'get_room',
  description: `Retrieves detailed information about a specific chat room including its name, description, type, member counts, and activity statistics. Optionally includes the list of room members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      includeMembers: z
        .boolean()
        .optional()
        .describe('Whether to include the member list. Defaults to false.')
    })
  )
  .output(
    z.object({
      roomId: z.number().describe('Room ID'),
      name: z.string().describe('Room name'),
      description: z.string().describe('Room description'),
      type: z.string().describe('Room type: my, direct, or group'),
      role: z.string().describe('User role in the room'),
      sticky: z.boolean().describe('Whether the room is pinned'),
      unreadCount: z.number().describe('Unread message count'),
      mentionCount: z.number().describe('Unread mention count'),
      taskCount: z.number().describe('Assigned task count'),
      messageCount: z.number().describe('Total message count'),
      fileCount: z.number().describe('Total file count'),
      iconPath: z.string().describe('Room icon URL'),
      lastUpdateTime: z.number().describe('Last update Unix timestamp'),
      members: z
        .array(
          z.object({
            accountId: z.number().describe('Member account ID'),
            name: z.string().describe('Member name'),
            role: z.string().describe('Member role: admin, member, or readonly'),
            chatworkId: z.string().describe('Chatwork ID'),
            organizationName: z.string().describe('Organization name'),
            department: z.string().describe('Department'),
            avatarImageUrl: z.string().describe('Avatar URL')
          })
        )
        .optional()
        .describe('Room members if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let room = await client.getRoom(ctx.input.roomId);

    let members = ctx.input.includeMembers
      ? (await client.getRoomMembers(ctx.input.roomId)).map(m => ({
          accountId: m.account_id,
          name: m.name,
          role: m.role,
          chatworkId: m.chatwork_id,
          organizationName: m.organization_name,
          department: m.department,
          avatarImageUrl: m.avatar_image_url
        }))
      : undefined;

    return {
      output: {
        roomId: room.room_id,
        name: room.name,
        description: room.description,
        type: room.type,
        role: room.role,
        sticky: room.sticky,
        unreadCount: room.unread_num,
        mentionCount: room.mention_num,
        taskCount: room.mytask_num,
        messageCount: room.message_num,
        fileCount: room.file_num,
        iconPath: room.icon_path,
        lastUpdateTime: room.last_update_time,
        members
      },
      message: `Retrieved room **${room.name}** (${room.type})${members ? ` with ${members.length} members` : ''}.`
    };
  })
  .build();
