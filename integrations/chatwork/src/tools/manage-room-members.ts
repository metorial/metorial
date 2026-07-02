import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRoomMembers = SlateTool.create(spec, {
  name: 'Manage Room Members',
  key: 'manage_room_members',
  description: `Updates the membership and roles of a chat room. Sets the complete member list — any members not included will be removed. At least one admin is required.`,
  instructions: [
    'This replaces the entire member list. Include all members you want to keep.',
    'Members not listed in any role array will be removed from the room.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      membersAdminIds: z
        .array(z.number())
        .min(1)
        .describe('Account IDs of admin members (at least one required)'),
      membersMemberIds: z
        .array(z.number())
        .optional()
        .describe('Account IDs of regular members'),
      membersReadonlyIds: z
        .array(z.number())
        .optional()
        .describe('Account IDs of read-only members')
    })
  )
  .output(
    z.object({
      adminIds: z.array(z.number()).describe('Account IDs with admin role'),
      memberIds: z.array(z.number()).describe('Account IDs with member role'),
      readonlyIds: z.array(z.number()).describe('Account IDs with readonly role')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.updateRoomMembers(ctx.input.roomId, {
      membersAdminIds: ctx.input.membersAdminIds,
      membersMemberIds: ctx.input.membersMemberIds,
      membersReadonlyIds: ctx.input.membersReadonlyIds
    });

    return {
      output: {
        adminIds: result.admin,
        memberIds: result.member,
        readonlyIds: result.readonly
      },
      message: `Updated room ${ctx.input.roomId} members: ${result.admin.length} admins, ${result.member.length} members, ${result.readonly.length} readonly.`
    };
  })
  .build();
