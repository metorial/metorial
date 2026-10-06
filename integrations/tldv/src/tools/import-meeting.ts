import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let importMeeting = SlateTool.create(spec, {
  name: 'Import Meeting',
  key: 'import_meeting',
  description:
    'Submit an external recording for transcription and analysis, or validate it with dryRun. Returns an asynchronous import job, not a completed meeting. Find the processed recording with list_meetings.',
  constraints: [
    'The URL must be publicly accessible.',
    'Supported formats: mp3, mp4, wav, m4a, mkv, mov, avi, wma and flac.',
    'The public API does not offer meeting deletion. Use dryRun when validating an import without creating a recording.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.url().describe('Publicly accessible URL of the recording to import.'),
      name: z
        .string()
        .min(1)
        .optional()
        .describe('Name for the recording. Defaults to Imported recording.'),
      happenedAt: z.iso
        .datetime({ offset: true })
        .optional()
        .describe('Meeting date and time in ISO 8601 format. Defaults to the current time.'),
      dryRun: z
        .boolean()
        .optional()
        .describe(
          'Validate the import without saving or processing a recording. Defaults to false.'
        ),
      participants: z
        .array(z.email())
        .optional()
        .describe('Email addresses of invited participants.'),
      phoneNumber: z
        .string()
        .max(64)
        .optional()
        .describe('Phone number associated with the recording.'),
      metadata: z
        .record(
          z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
          z.union([z.string().max(256), z.number(), z.boolean()])
        )
        .optional()
        .describe(
          'Up to 20 custom correlation keys with string, number or boolean values. Keys use letters, digits, underscores and hyphens.'
        )
    })
  )
  .output(
    z.object({
      meetingId: z
        .string()
        .optional()
        .describe(
          'Reserved for a completed meeting identifier; URL imports return jobId instead.'
        ),
      name: z.string().describe('Name assigned to the imported meeting.'),
      url: z
        .string()
        .optional()
        .describe(
          'Reserved for a completed meeting URL; discover the processed recording with list_meetings.'
        ),
      success: z.boolean().describe('Whether the import request was accepted.'),
      jobId: z
        .string()
        .optional()
        .describe(
          'Import processing job identifier, when returned. This is not a meeting ID.'
        ),
      message: z.string().describe('Provider response explaining the import status.'),
      dryRun: z.boolean().describe('Whether the request only validated the import.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let name = ctx.input.name ?? 'Imported recording';
    let result = await client.importMeeting({
      name,
      url: ctx.input.sourceUrl,
      happenedAt: ctx.input.happenedAt,
      dryRun: ctx.input.dryRun,
      participants: ctx.input.participants,
      phoneNumber: ctx.input.phoneNumber,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        name,
        success: result.success,
        jobId: result.jobId,
        message: result.message,
        dryRun: ctx.input.dryRun ?? false
      },
      message: ctx.input.dryRun
        ? `Validated recording **${name}** without saving or processing it.`
        : `Accepted recording **${name}** for processing. Use list_meetings to find the completed meeting.`
    };
  })
  .build();
