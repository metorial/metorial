import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the user associated with this API key, including their ID, name, email, and timezone.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Current user ID'),
      username: z.string().optional().describe('Username'),
      realname: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      timezone: z.string().optional().describe('User timezone'),
      isEnabled: z.number().optional().describe('Whether the user is enabled (0 or 1)')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.user_id,
        username: user.username,
        realname: user.realname,
        email: user.email,
        timezone: user.timezone,
        isEnabled: user.is_enabled
      },
      message: `Connected as **${user.realname || user.username || user.user_id}**.`
    };
  })
  .build();
