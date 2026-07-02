import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let iconPresets = z.enum([
  'group',
  'check',
  'document',
  'meeting',
  'event',
  'project',
  'business',
  'study',
  'security',
  'star',
  'idea',
  'heart',
  'magcup',
  'beer',
  'music',
  'sports',
  'travel'
]);

export let createRoom = SlateTool.create(spec, {
  name: 'Create Room',
  key: 'create_room',
  description: `Creates a new group chat room. Requires at least one admin member. Members can be assigned roles: admin, member, or read-only. Optionally creates an invitation link for the room.`,
  instructions: [
    'The authenticated user should typically be included in membersAdminIds.',
    'At least one admin member ID is required.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().min(1).max(255).describe('Chat room name'),
      description: z.string().optional().describe('Chat room description'),
      iconPreset: iconPresets.optional().describe('Icon preset for the room'),
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
        .describe('Account IDs of read-only members'),
      createInviteLink: z
        .boolean()
        .optional()
        .describe('Whether to create an invitation link'),
      inviteLinkCode: z
        .string()
        .optional()
        .describe(
          'Custom path for the invitation link (1-50 chars, alphanumeric/dash/underscore)'
        ),
      inviteLinkNeedAcceptance: z
        .boolean()
        .optional()
        .describe('Whether the invitation link requires admin approval')
    })
  )
  .output(
    z.object({
      roomId: z.number().describe('ID of the created room')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.createRoom({
      name: ctx.input.name,
      description: ctx.input.description,
      iconPreset: ctx.input.iconPreset,
      membersAdminIds: ctx.input.membersAdminIds,
      membersMemberIds: ctx.input.membersMemberIds,
      membersReadonlyIds: ctx.input.membersReadonlyIds,
      link: ctx.input.createInviteLink,
      linkCode: ctx.input.inviteLinkCode,
      linkNeedAcceptance: ctx.input.inviteLinkNeedAcceptance
    });

    return {
      output: { roomId: result.room_id },
      message: `Created room **${ctx.input.name}** (ID: ${result.room_id}).`
    };
  })
  .build();
