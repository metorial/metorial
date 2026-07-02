import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a Facebook user's profile information including name, email, birthday, location, and profile picture.
Use \`userId\` to fetch a specific user, or omit it to get the authenticated user's profile.
Available fields depend on the granted permissions and the user's privacy settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe("Facebook user ID. Omit to get the authenticated user's profile.")
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Facebook user ID'),
      name: z.string().optional().describe("User's full name"),
      email: z.string().optional().describe("User's email address"),
      birthday: z.string().optional().describe("User's birthday"),
      location: z.string().optional().describe("User's location name"),
      profileLink: z.string().optional().describe("Link to the user's profile"),
      pictureUrl: z.string().optional().describe("URL of the user's profile picture")
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let user = ctx.input.userId
      ? await client.getUserById(ctx.input.userId)
      : await client.getMe();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        birthday: user.birthday,
        location: user.location?.name,
        profileLink: user.link,
        pictureUrl: user.picture?.data?.url
      },
      message: `Retrieved profile for **${user.name || user.id}**.`
    };
  })
  .build();
