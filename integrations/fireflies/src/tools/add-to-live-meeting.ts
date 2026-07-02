import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let addToLiveMeeting = SlateTool.create(spec, {
  name: 'Add Bot to Live Meeting',
  key: 'add_to_live_meeting',
  description: `Add the Fireflies.ai bot to an ongoing live meeting for automatic recording and transcription. Provide a valid meeting URL from supported platforms and optional attendee context.`,
  constraints: [
    'Rate limited to 3 requests per 20 minutes.',
    'Meeting duration defaults to 60 minutes (min 15, max 120).'
  ]
})
  .input(
    z.object({
      meetingLink: z.string().describe('Valid meeting URL (e.g. Zoom, Google Meet, Teams)'),
      title: z.string().optional().describe('Title for the meeting (max 256 characters)'),
      meetingPassword: z
        .string()
        .optional()
        .describe('Meeting password if required (max 32 characters)'),
      duration: z
        .number()
        .optional()
        .describe('Expected meeting duration in minutes (15-120, defaults to 60)'),
      language: z
        .string()
        .optional()
        .describe('Language code for transcription (e.g. "en", "es"). Defaults to English.'),
      attendees: z
        .array(
          z.object({
            displayName: z.string().optional(),
            email: z.string().optional(),
            phoneNumber: z.string().optional()
          })
        )
        .optional()
        .describe('Expected attendees for speaker identification and CRM integration')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the bot was successfully added to the meeting')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.title && ctx.input.title.length > 256) {
      throw firefliesServiceError('title must be 256 characters or fewer.');
    }
    if (ctx.input.meetingPassword && ctx.input.meetingPassword.length > 32) {
      throw firefliesServiceError('meetingPassword must be 32 characters or fewer.');
    }
    if (
      ctx.input.duration !== undefined &&
      (!Number.isInteger(ctx.input.duration) ||
        ctx.input.duration < 15 ||
        ctx.input.duration > 120)
    ) {
      throw firefliesServiceError('duration must be an integer between 15 and 120.');
    }
    if (ctx.input.language && ctx.input.language.length > 5) {
      throw firefliesServiceError('language must be 5 characters or fewer.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.addToLiveMeeting({
      meetingLink: ctx.input.meetingLink,
      title: ctx.input.title,
      meetingPassword: ctx.input.meetingPassword,
      duration: ctx.input.duration,
      language: ctx.input.language,
      attendees: ctx.input.attendees
    });

    return {
      output: { success: result?.success ?? false },
      message: result?.success
        ? `Fireflies bot added to meeting${ctx.input.title ? ` "${ctx.input.title}"` : ''}.`
        : 'Failed to add bot to meeting.'
    };
  })
  .build();
