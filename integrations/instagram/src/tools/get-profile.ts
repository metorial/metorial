import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let getProfileTool = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve an Instagram Business or Creator account's profile information including username, biography, follower/following counts, and media count. Can fetch your own profile or discover another business/creator account by username.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user if not provided.'),
      targetUsername: z
        .string()
        .optional()
        .describe(
          'Look up another Business/Creator account by username via Business Discovery. Cannot be used with userId.'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Instagram user ID'),
      username: z.string().optional().describe('Instagram username'),
      name: z.string().optional().describe('Display name'),
      biography: z.string().optional().describe('Account biography'),
      profilePictureUrl: z.string().optional().describe('Profile picture URL'),
      followersCount: z.number().optional().describe('Number of followers'),
      followsCount: z.number().optional().describe('Number of accounts followed'),
      mediaCount: z.number().optional().describe('Total number of media posts'),
      website: z.string().optional().describe('Website URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';

    if (ctx.input.targetUsername) {
      let discovery = await client.businessDiscovery(
        effectiveUserId,
        ctx.input.targetUsername
      );
      return {
        output: {
          userId: discovery.id || '',
          username: discovery.username,
          name: discovery.name,
          biography: discovery.biography,
          profilePictureUrl: discovery.profile_picture_url,
          followersCount: discovery.followers_count,
          followsCount: discovery.follows_count,
          mediaCount: discovery.media_count,
          website: discovery.website
        },
        message: `Retrieved profile for **@${discovery.username}** — ${discovery.followers_count?.toLocaleString() ?? 'N/A'} followers, ${discovery.media_count ?? 'N/A'} posts.`
      };
    }

    let profile = await client.getProfile(effectiveUserId);

    return {
      output: {
        userId: profile.id,
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        profilePictureUrl: profile.profile_picture_url,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count,
        website: profile.website
      },
      message: `Retrieved profile for **@${profile.username}** — ${profile.followers_count?.toLocaleString() ?? 'N/A'} followers, ${profile.media_count ?? 'N/A'} posts.`
    };
  })
  .build();
