import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's profile information including user ID, team ID, and display name.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('The user ID'),
      teamId: z.string().describe("The ID of the user's Canva team"),
      displayName: z.string().optional().describe('The display name shown in the Canva UI')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    return {
      output: user,
      message: `Retrieved profile for user **${user.displayName || user.userId}** (Team: ${user.teamId}).`
    };
  })
  .build();
