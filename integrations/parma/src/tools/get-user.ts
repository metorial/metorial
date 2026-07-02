import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the authenticated user's profile information from Parma CRM. Use this to verify the current connection, check account details, or retrieve the user's identity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique ID of the user'),
      name: z.string().optional().describe('Full name of the user'),
      email: z.string().optional().describe('Email address of the user'),
      imageUrl: z.string().optional().describe('URL of the user profile image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ParmaClient(ctx.auth.token);

    let user = await client.getMe();

    return {
      output: {
        userId: String(user.id),
        name: user.name ?? user.full_name ?? undefined,
        email: user.email ?? undefined,
        imageUrl: user.avatar_url ?? user.image_url ?? undefined
      },
      message: `Authenticated as **${user.name ?? user.full_name ?? user.email ?? 'Unknown'}**.`
    };
  })
  .build();
