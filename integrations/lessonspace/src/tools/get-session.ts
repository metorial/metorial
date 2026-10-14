import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieves detailed information about a specific session by its UUID. Returns participant profiles, timing, recording status, summary, and associated space details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionUuid: z.string().describe('UUID of the session to retrieve.')
    })
  )
  .output(
    z.object({
      sessionId: z.number().describe('Internal session ID.'),
      sessionUuid: z.string().describe('Session UUID.'),
      name: z.string().nullable().describe('Session display name.'),
      startTime: z.string().describe('ISO 8601 timestamp of when the session started.'),
      endTime: z
        .string()
        .nullable()
        .describe('ISO 8601 timestamp of when the session ended, or null if in progress.'),
      profiles: z
        .array(
          z.object({
            userId: z.number().describe('Lessonspace user ID.'),
            name: z.string().nullable().describe('User display name.'),
            email: z.string().describe('User email.'),
            role: z.string().describe('User role: teacher, student, or admin.')
          })
        )
        .describe('Participants in the session.'),
      guests: z
        .array(
          z.object({
            socketId: z
              .string()
              .optional()
              .describe('Socket identifier when provided by the API.'),
            name: z.string().nullable().describe('Guest display name when available.'),
            guestId: z.number().optional().describe('Internal guest record ID.'),
            guestUuid: z.string().optional().describe('Stable UUID of the guest record.'),
            sessionId: z
              .number()
              .optional()
              .describe('Internal session ID associated with the guest.')
          })
        )
        .describe('Guest participants in the session.'),
      billableSeconds: z.number().describe('Duration in seconds billed for this session.'),
      tags: z.string().describe('Tags associated with the session.'),
      summary: z.string().nullable().describe('AI-generated lesson summary, if available.'),
      playbackUrl: z
        .string()
        .nullable()
        .describe(
          'Authenticated API endpoint for playback. Call get_recording for a viewing URL.'
        ),
      recordingAvailable: z.boolean().describe('Whether a recording is available.'),
      recordingDeleted: z.boolean().describe('Whether the recording has been deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let session = await client.getSession(ctx.input.sessionUuid);

    return {
      output: {
        sessionId: session.id,
        sessionUuid: session.uuid,
        name: session.name,
        startTime: session.startTime,
        endTime: session.endTime,
        profiles: session.profiles.map(p => ({
          userId: p.user,
          name: p.name,
          email: p.email,
          role: p.role
        })),
        guests: session.guests.map(g => ({
          socketId: g.socketId,
          name: g.name,
          guestId: g.id,
          guestUuid: g.uuid,
          sessionId: g.session
        })),
        billableSeconds: session.billableSeconds,
        tags: session.tags,
        summary: session.summary,
        playbackUrl: session.playbackUrl,
        recordingAvailable: session.recordingAvailable,
        recordingDeleted: session.recordingDeleted
      },
      message: `Session **${session.name || session.uuid}** — started ${session.startTime}${session.endTime ? `, ended ${session.endTime}` : ' (in progress)'}, ${session.profiles.length} participants.`
    };
  })
  .build();
