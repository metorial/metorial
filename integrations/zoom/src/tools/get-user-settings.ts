import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getUserSettings = SlateTool.create(spec, {
  name: 'Get User Settings',
  key: 'get_user_settings',
  description:
    'Retrieve Zoom user settings, including meeting, recording, telephony, and feature preferences.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID or email used for the request'),
      settings: z.any().describe('Full Zoom settings response for the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let settings = await client.getUserSettings(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        settings
      },
      message: `Retrieved settings for user **${ctx.input.userId}**.`
    };
  })
  .build();
