import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { mapUser, userSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user',
  description: `Retrieve the profile of the authenticated user or a specific user by ID. Returns account details, bio, location, and profile picture.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe("User ID to look up. Leave empty to get the authenticated user's profile.")
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let user = ctx.input.userId
      ? await client.getUser(ctx.input.userId)
      : await client.getMe();
    let mapped = mapUser(user);

    return {
      output: mapped,
      message: `Retrieved profile for **${mapped.name}** (${mapped.userId})`
    };
  })
  .build();
