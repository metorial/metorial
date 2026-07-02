import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let membershipOutputSchema = z.object({
  membershipId: z.string().describe('Unique ID of the membership'),
  roomId: z.string().optional().describe('ID of the space'),
  personId: z.string().optional().describe('ID of the person'),
  personEmail: z.string().optional().describe('Email of the person'),
  personDisplayName: z.string().optional().describe('Display name of the person'),
  personOrgId: z.string().optional().describe('Organization ID of the person'),
  isModerator: z.boolean().optional().describe('Whether the person is a moderator'),
  roomType: z.string().optional().describe('Type of room (direct or group)'),
  created: z.string().optional().describe('Membership creation timestamp')
});

export let addMember = SlateTool.create(spec, {
  name: 'Add Member to Space',
  key: 'add_member',
  description: `Add a person to a Webex space by their person ID or email address. Optionally grant moderator privileges. You must be a member of the space to add others.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the space to add the person to'),
      personId: z.string().optional().describe('Person ID to add'),
      personEmail: z.string().optional().describe('Email address of the person to add'),
      isModerator: z.boolean().optional().describe('Grant moderator role to the person')
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.createMembership({
      roomId: ctx.input.roomId,
      personId: ctx.input.personId,
      personEmail: ctx.input.personEmail,
      isModerator: ctx.input.isModerator
    });

    return {
      output: {
        membershipId: result.id,
        roomId: result.roomId,
        personId: result.personId,
        personEmail: result.personEmail,
        personDisplayName: result.personDisplayName,
        personOrgId: result.personOrgId,
        isModerator: result.isModerator,
        roomType: result.roomType,
        created: result.created
      },
      message: `**${result.personDisplayName || result.personEmail}** added to space.`
    };
  })
  .build();

export let updateMember = SlateTool.create(spec, {
  name: 'Update Membership',
  key: 'update_member',
  description: `Update a membership in a Webex space. Can toggle moderator status or hide/show a direct space from the member's space list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      membershipId: z.string().describe('ID of the membership to update'),
      isModerator: z.boolean().optional().describe('Grant or revoke moderator role'),
      isRoomHidden: z
        .boolean()
        .optional()
        .describe("Hide or show the space in the member's list")
    })
  )
  .output(membershipOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.updateMembership(ctx.input.membershipId, {
      isModerator: ctx.input.isModerator,
      isRoomHidden: ctx.input.isRoomHidden
    });

    return {
      output: {
        membershipId: result.id,
        roomId: result.roomId,
        personId: result.personId,
        personEmail: result.personEmail,
        personDisplayName: result.personDisplayName,
        personOrgId: result.personOrgId,
        isModerator: result.isModerator,
        roomType: result.roomType,
        created: result.created
      },
      message: `Membership for **${result.personDisplayName || result.personEmail}** updated.`
    };
  })
  .build();

export let removeMember = SlateTool.create(spec, {
  name: 'Remove Member from Space',
  key: 'remove_member',
  description: `Remove a person from a Webex space by deleting their membership. The person will no longer be able to see the space or its messages.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      membershipId: z.string().describe('ID of the membership to remove')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the membership was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    await client.deleteMembership(ctx.input.membershipId);

    return {
      output: { deleted: true },
      message: `Membership **${ctx.input.membershipId}** removed from space.`
    };
  })
  .build();
