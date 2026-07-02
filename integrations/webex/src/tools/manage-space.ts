import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let spaceOutputSchema = z.object({
  spaceId: z.string().describe('Unique ID of the space'),
  title: z.string().optional().describe('Title of the space'),
  type: z.string().optional().describe('Type of space (direct or group)'),
  isLocked: z.boolean().optional().describe('Whether the space is moderated'),
  teamId: z.string().optional().describe('ID of the team this space belongs to'),
  lastActivity: z.string().optional().describe('Timestamp of last activity'),
  creatorId: z.string().optional().describe('Person ID of the space creator'),
  created: z.string().optional().describe('Creation timestamp'),
  isAnnouncementOnly: z.boolean().optional().describe('Whether only moderators can post'),
  isReadOnly: z.boolean().optional().describe('Whether the space is read-only'),
  isPublic: z.boolean().optional().describe('Whether the space is publicly discoverable'),
  description: z.string().optional().describe('Space description')
});

export let createSpace = SlateTool.create(spec, {
  name: 'Create Space',
  key: 'create_space',
  description: `Create a new Webex space (room). The authenticated user is automatically added as a member. Optionally associate the space with a team, enable moderation, or make it public within the organization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title for the new space'),
      teamId: z.string().optional().describe('Team ID to associate the space with'),
      isLocked: z.boolean().optional().describe('Enable moderation on the space'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Make the space publicly discoverable in the organization'),
      description: z
        .string()
        .optional()
        .describe('Description for the space (required if public)'),
      isAnnouncementOnly: z
        .boolean()
        .optional()
        .describe('Only allow moderators to post messages')
    })
  )
  .output(spaceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.createRoom({
      title: ctx.input.title,
      teamId: ctx.input.teamId,
      isLocked: ctx.input.isLocked,
      isPublic: ctx.input.isPublic,
      description: ctx.input.description,
      isAnnouncementOnly: ctx.input.isAnnouncementOnly
    });

    return {
      output: {
        spaceId: result.id,
        title: result.title,
        type: result.type,
        isLocked: result.isLocked,
        teamId: result.teamId,
        lastActivity: result.lastActivity,
        creatorId: result.creatorId,
        created: result.created,
        isAnnouncementOnly: result.isAnnouncementOnly,
        isReadOnly: result.isReadOnly,
        isPublic: result.isPublic,
        description: result.description
      },
      message: `Space **${result.title}** created successfully.`
    };
  })
  .build();

export let updateSpace = SlateTool.create(spec, {
  name: 'Update Space',
  key: 'update_space',
  description: `Update an existing Webex space's properties. Can modify the title, moderation settings, public visibility, description, announcement-only mode, and read-only status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('ID of the space to update'),
      title: z.string().optional().describe('New title for the space'),
      isLocked: z.boolean().optional().describe('Enable or disable moderation'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Make the space publicly discoverable or private'),
      description: z.string().optional().describe('Updated description for the space'),
      isAnnouncementOnly: z
        .boolean()
        .optional()
        .describe('Enable or disable announcement-only mode'),
      isReadOnly: z.boolean().optional().describe('Make the space read-only or writable'),
      teamId: z
        .string()
        .optional()
        .describe('Assign the space to a team (only for unowned spaces)')
    })
  )
  .output(spaceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.updateRoom(ctx.input.spaceId, {
      title: ctx.input.title,
      isLocked: ctx.input.isLocked,
      isPublic: ctx.input.isPublic,
      description: ctx.input.description,
      isAnnouncementOnly: ctx.input.isAnnouncementOnly,
      isReadOnly: ctx.input.isReadOnly,
      teamId: ctx.input.teamId
    });

    return {
      output: {
        spaceId: result.id,
        title: result.title,
        type: result.type,
        isLocked: result.isLocked,
        teamId: result.teamId,
        lastActivity: result.lastActivity,
        creatorId: result.creatorId,
        created: result.created,
        isAnnouncementOnly: result.isAnnouncementOnly,
        isReadOnly: result.isReadOnly,
        isPublic: result.isPublic,
        description: result.description
      },
      message: `Space **${result.title}** updated successfully.`
    };
  })
  .build();

export let deleteSpace = SlateTool.create(spec, {
  name: 'Delete Space',
  key: 'delete_space',
  description: `Permanently delete a Webex space and all of its contents. This action cannot be undone. Team spaces are archived rather than deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('ID of the space to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the space was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    await client.deleteRoom(ctx.input.spaceId);

    return {
      output: { deleted: true },
      message: `Space **${ctx.input.spaceId}** deleted successfully.`
    };
  })
  .build();
