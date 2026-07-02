import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Get the public profile of a Cults3D user by their username. Returns bio, avatar, follower count, and number of published creations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nick: z.string().describe('Username of the Cults3D user')
    })
  )
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

    let user = await client.getUser(ctx.input.nick);

    if (!user) {
      throw new Error(`User "${ctx.input.nick}" not found`);
    }

    return {
      output: {
        nick: user.nick,
        shortUrl: user.shortUrl,
        bio: user.bio,
        imageUrl: user.imageUrl,
        followersCount: user.followersCount,
        creationsCount: user.creationsCount
      },
      message: `User **${user.nick}**: ${user.creationsCount ?? 0} creations, ${user.followersCount ?? 0} followers.`
    };
  })
  .build();
