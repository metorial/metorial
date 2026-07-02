import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let getMe = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_me',
  description: `Get the profile and account details of the currently authenticated Toggl user, including their default workspace and timezone.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      email: z.string().describe('User email'),
      fullName: z.string().nullable().describe('User full name'),
      timezone: z.string().nullable().describe('User timezone'),
      defaultWorkspaceId: z.number().nullable().describe('Default workspace ID'),
      imageUrl: z.string().nullable().describe('User avatar URL'),
      createdAt: z.string().describe('Account creation timestamp'),
      beginningOfWeek: z.number().nullable().describe('Day of week start (0=Sunday, 1=Monday)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let me = await client.getMe();

    return {
      output: {
        userId: me.id,
        email: me.email,
        fullName: me.fullname ?? null,
        timezone: me.timezone ?? null,
        defaultWorkspaceId: me.default_workspace_id ?? me.default_wid ?? null,
        imageUrl: me.image_url ?? null,
        createdAt: me.created_at ?? me.at,
        beginningOfWeek: me.beginning_of_week ?? null
      },
      message: `Authenticated as **${me.fullname ?? me.email}**`
    };
  })
  .build();
