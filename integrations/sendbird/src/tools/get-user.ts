import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a single user's profile, including nickname, profile image, activity status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique user ID'),
      nickname: z.string().describe('Display name'),
      profileUrl: z.string().describe('Profile image URL'),
      isActive: z.boolean().describe('Whether the user is active'),
      isOnline: z.boolean().optional().describe('Whether the user is currently online'),
      lastSeenAt: z.number().optional().describe('Unix timestamp of last seen'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: result.user_id,
        nickname: result.nickname,
        profileUrl: result.profile_url ?? '',
        isActive: result.is_active ?? true,
        isOnline: result.is_online,
        lastSeenAt: result.last_seen_at,
        createdAt: result.created_at ?? 0,
        metadata: result.metadata
      },
      message: `Retrieved user **${result.nickname}** (${result.user_id}). Active: ${result.is_active}.`
    };
  })
  .build();
