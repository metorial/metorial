import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated TikTok user's profile information including display name, avatar, bio, verification status, follower/following counts, and video count. The level of detail depends on the granted OAuth scopes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeStats: z
        .boolean()
        .optional()
        .describe(
          'Whether to include follower/following counts and video count (requires user.info.stats scope).'
        ),
      includeProfile: z
        .boolean()
        .optional()
        .describe(
          'Whether to include bio, username, and verification status (requires user.info.profile scope).'
        )
    })
  )
  .output(
    z.object({
      openId: z.string().optional().describe('Unique open ID for the user.'),
      unionId: z.string().optional().describe('Union ID across apps by the same developer.'),
      displayName: z.string().optional().describe('User display name.'),
      avatarUrl: z.string().optional().describe('Avatar image URL.'),
      avatarLargeUrl: z.string().optional().describe('Large avatar image URL.'),
      username: z.string().optional().describe('Unique username.'),
      bioDescription: z.string().optional().describe('User bio text.'),
      isVerified: z.boolean().optional().describe('Whether the user is verified.'),
      profileDeepLink: z.string().optional().describe('Deep link to the user profile.'),
      followerCount: z.number().optional().describe('Number of followers.'),
      followingCount: z.number().optional().describe('Number of accounts followed.'),
      likesCount: z.number().optional().describe('Total number of likes received.'),
      videoCount: z.number().optional().describe('Number of public videos.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokConsumerClient({ token: ctx.auth.token });

    let fields = ['open_id', 'union_id', 'avatar_url', 'avatar_large_url', 'display_name'];

    if (ctx.input.includeProfile) {
      fields.push('bio_description', 'profile_deep_link', 'is_verified', 'username');
    }

    if (ctx.input.includeStats) {
      fields.push('follower_count', 'following_count', 'likes_count', 'video_count');
    }

    let user = await client.getUserInfo(fields);

    return {
      output: {
        openId: user.open_id,
        unionId: user.union_id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        avatarLargeUrl: user.avatar_large_url,
        username: user.username,
        bioDescription: user.bio_description,
        isVerified: user.is_verified,
        profileDeepLink: user.profile_deep_link,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        likesCount: user.likes_count,
        videoCount: user.video_count
      },
      message: `Retrieved profile for **${user.display_name ?? 'unknown user'}**${user.username ? ` (@${user.username})` : ''}.`
    };
  })
  .build();
