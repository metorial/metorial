import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let getSpace = SlateTool.create(spec, {
  name: 'Get Space Details',
  key: 'get_space',
  description: `Retrieve full details of a specific Webex space by its ID, including title, type, moderation status, team association, and activity timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('ID of the space to retrieve')
    })
  )
  .output(
    z.object({
      spaceId: z.string().describe('Unique ID of the space'),
      title: z.string().optional().describe('Title of the space'),
      type: z.string().optional().describe('Type of space (direct or group)'),
      isLocked: z.boolean().optional().describe('Whether the space is moderated'),
      teamId: z.string().optional().describe('Associated team ID'),
      lastActivity: z.string().optional().describe('Timestamp of last activity'),
      creatorId: z.string().optional().describe('Person ID of the creator'),
      created: z.string().optional().describe('Creation timestamp'),
      ownerId: z.string().optional().describe('Organization ID that owns the space'),
      isAnnouncementOnly: z.boolean().optional().describe('Whether only moderators can post'),
      isReadOnly: z.boolean().optional().describe('Whether the space is read-only'),
      isPublic: z.boolean().optional().describe('Whether the space is publicly discoverable'),
      description: z.string().optional().describe('Space description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.getRoom(ctx.input.spaceId);

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
        ownerId: result.ownerId,
        isAnnouncementOnly: result.isAnnouncementOnly,
        isReadOnly: result.isReadOnly,
        isPublic: result.isPublic,
        description: result.description
      },
      message: `Space **${result.title}** (${result.type}).`
    };
  })
  .build();
