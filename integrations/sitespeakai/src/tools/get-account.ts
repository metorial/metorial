import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account details for the authenticated user, including name, email, and profile photo. Useful for verifying the connected account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User account ID.'),
      name: z.string().nullable().describe('User name.'),
      email: z.string().nullable().describe('User email address.'),
      profilePhotoUrl: z.string().nullable().describe('URL of the user profile photo.'),
      createdAt: z.string().nullable().describe('Account creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getMe();

    return {
      output: {
        userId: user.id?.toString() ?? '',
        name: user.name ?? null,
        email: user.email ?? null,
        profilePhotoUrl: user.profile_photo_url ?? user.avatar ?? null,
        createdAt: user.created_at ?? null
      },
      message: `Account: **${user.name ?? user.email ?? 'Unknown'}**`
    };
  })
  .build();
