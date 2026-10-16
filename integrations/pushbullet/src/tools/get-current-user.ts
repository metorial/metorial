import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the connected Pushbullet account, including its user identifier, email, profile name, and maximum upload size.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userIden: z.string().describe('Connected user identifier'),
      email: z.string().describe('Account email address'),
      normalizedEmail: z.string().optional().describe('Canonical account email address'),
      name: z.string().optional().describe('Profile name, when available'),
      imageUrl: z.string().optional().describe('Profile image URL'),
      maxUploadSize: z.number().optional().describe('Maximum upload size in bytes'),
      created: z.string().describe('Account creation Unix timestamp in seconds'),
      modified: z.string().describe('Account modification Unix timestamp in seconds'),
      raw: z.unknown().describe('Complete account response')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getMe();
    return {
      output: {
        userIden: user.iden,
        email: user.email,
        normalizedEmail: user.email_normalized,
        name: user.name,
        imageUrl: user.image_url,
        maxUploadSize: user.max_upload_size,
        created: String(user.created),
        modified: String(user.modified),
        raw: user
      },
      message: `Connected to Pushbullet as **${user.name ?? user.email}**.`
    };
  })
  .build();
