import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's profile. Can change nickname, profile image, active status, and metadata. Deactivating a user can optionally remove them from all channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to update'),
      nickname: z.string().optional().describe('New display name'),
      profileUrl: z.string().optional().describe('New profile image URL'),
      isActive: z.boolean().optional().describe('Set to false to deactivate the user'),
      leaveAllWhenDeactivated: z
        .boolean()
        .optional()
        .describe('If deactivating, whether to remove the user from all channels'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata to set on the user (replaces existing)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique user ID'),
      nickname: z.string().describe('Updated display name'),
      profileUrl: z.string().describe('Updated profile image URL'),
      isActive: z.boolean().describe('Whether the user is active'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.updateUser(ctx.input.userId, {
      nickname: ctx.input.nickname,
      profileUrl: ctx.input.profileUrl,
      isActive: ctx.input.isActive,
      leaveAllWhenDeactivated: ctx.input.leaveAllWhenDeactivated,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        userId: result.user_id,
        nickname: result.nickname,
        profileUrl: result.profile_url ?? '',
        isActive: result.is_active ?? true,
        createdAt: result.created_at ?? 0,
        metadata: result.metadata
      },
      message: `Updated user **${result.nickname}** (${result.user_id}).`
    };
  })
  .build();
