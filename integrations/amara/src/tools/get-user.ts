import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `View a user's profile information including their name, biography, video count, languages, and avatar.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIdentifier: z.string().describe('Username or user ID (e.g. "alice" or "id$abc123")')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Username'),
      userId: z.string().describe('User ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      fullName: z.string().describe('Full display name'),
      homepage: z.string().describe('Homepage URL'),
      biography: z.string().describe('User biography'),
      numVideos: z.number().describe('Number of videos'),
      languages: z.array(z.string()).describe('Languages the user knows'),
      avatar: z.string().describe('Avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let u = await client.getUser(ctx.input.userIdentifier);

    return {
      output: {
        username: u.username,
        userId: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        fullName: u.full_name,
        homepage: u.homepage,
        biography: u.biography,
        numVideos: u.num_videos,
        languages: u.languages,
        avatar: u.avatar
      },
      message: `Retrieved profile for **${u.full_name || u.username}** (\`${u.username}\`).`
    };
  })
  .build();
