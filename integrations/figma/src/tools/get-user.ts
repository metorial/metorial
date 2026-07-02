import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the currently authenticated Figma user's profile, including name, email, and avatar.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      handle: z.string().describe('Display name'),
      email: z.string().describe('Email address'),
      imageUrl: z.string().optional().describe('Profile avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let user = await client.getMe();

    return {
      output: {
        userId: user.id,
        handle: user.handle,
        email: user.email,
        imageUrl: user.img_url
      },
      message: `Authenticated as **${user.handle}** (${user.email})`
    };
  })
  .build();
