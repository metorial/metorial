import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';
import { assertEmailList } from './shared';

export let shareMeeting = SlateTool.create(spec, {
  name: 'Share Meeting',
  key: 'share_meeting',
  description: `Share a meeting transcript with other users via email. Optionally set an expiry period of 7, 14, or 30 days. Only meeting owners or team admins can share meetings.`,
  constraints: [
    'Maximum 50 email addresses per request.',
    'Rate limited to 10 requests per hour.'
  ]
})
  .input(
    z.object({
      meetingId: z.string().describe('The meeting/transcript ID to share'),
      emails: z.array(z.string()).describe('Email addresses to share the meeting with'),
      expiryDays: z
        .number()
        .optional()
        .describe('Access expiry in days. Must be one of 7, 14, or 30.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the sharing operation succeeded'),
      message: z.string().nullable().describe('Additional context or error message')
    })
  )
  .handleInvocation(async ctx => {
    assertEmailList(ctx.input.emails, 50);
    if (ctx.input.expiryDays !== undefined && ![7, 14, 30].includes(ctx.input.expiryDays)) {
      throw firefliesServiceError('expiryDays must be one of 7, 14, or 30.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.shareMeeting({
      meetingId: ctx.input.meetingId,
      emails: ctx.input.emails,
      expiryDays: ctx.input.expiryDays
    });

    return {
      output: {
        success: result?.success ?? false,
        message: result?.message ?? null
      },
      message: result?.success
        ? `Meeting shared with **${ctx.input.emails.length}** recipient(s).${ctx.input.expiryDays ? ` Access expires in ${ctx.input.expiryDays} days.` : ''}`
        : `Failed to share meeting: ${result?.message ?? 'Unknown error'}`
    };
  })
  .build();
