import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let revokeMeetingAccess = SlateTool.create(spec, {
  name: 'Revoke Meeting Access',
  key: 'revoke_meeting_access',
  description: `Revoke a user's access to a previously shared meeting transcript. Only meeting owners or team admins can revoke access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The meeting/transcript ID'),
      email: z.string().describe('Email address of the user whose access to revoke')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether access was successfully revoked'),
      message: z.string().nullable().describe('Additional context or error message')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.email.trim()) {
      throw firefliesServiceError('email is required.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.revokeSharedMeetingAccess(ctx.input.meetingId, ctx.input.email);

    return {
      output: {
        success: result?.success ?? false,
        message: result?.message ?? null
      },
      message: result?.success
        ? `Revoked access for **${ctx.input.email}** to meeting ${ctx.input.meetingId}.`
        : `Failed to revoke access: ${result?.message ?? 'Unknown error'}`
    };
  })
  .build();
