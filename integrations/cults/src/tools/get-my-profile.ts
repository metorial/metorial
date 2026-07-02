import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let getMyProfile = SlateTool.create(spec, {
  name: 'Get My Profile',
  key: 'get_my_profile',
  description: `Retrieve the authenticated user's Cults3D profile including username, bio, avatar, follower count, and number of published creations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      nick: z.string().describe('Username'),
      shortUrl: z.string().nullable().describe('Profile short URL'),
      bio: z.string().nullable().describe('Profile biography'),
      imageUrl: z.string().nullable().describe('Avatar image URL'),
      followersCount: z.number().nullable().describe('Number of followers'),
      creationsCount: z.number().nullable().describe('Number of published creations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let profile = await client.getMyProfile();

    return {
      output: {
        nick: profile.nick,
        shortUrl: profile.shortUrl,
        bio: profile.bio,
        imageUrl: profile.imageUrl,
        followersCount: profile.followersCount,
        creationsCount: profile.creationsCount
      },
      message: `Profile for **${profile.nick}**: ${profile.creationsCount ?? 0} creations, ${profile.followersCount ?? 0} followers.`
    };
  })
  .build();
