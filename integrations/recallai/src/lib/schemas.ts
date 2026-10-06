import { z } from 'zod';
import type { Recording } from './client';

export const calendarSchema = z.object({
  calendarId: z.string(),
  platform: z.string(),
  platformEmail: z.string().nullable(),
  status: z.string(),
  createdAt: z.string()
});
export const eventSchema = z.object({
  eventId: z.string(),
  calendarId: z.string(),
  meetingUrl: z.string().nullable(),
  meetingPlatform: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string().nullable(),
  isDeleted: z.boolean(),
  updatedAt: z.string(),
  bots: z.array(
    z.object({
      botId: z.string(),
      startTime: z.string(),
      deduplicationKey: z.string(),
      meetingUrl: z.string()
    })
  )
});
export const recordingSchema = z.object({
  recordingId: z.string(),
  botId: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  media: z.array(
    z.object({
      mediaId: z.string(),
      kind: z.string(),
      status: z.string(),
      format: z.string().nullable()
    })
  )
});
export const recordingOutput = (recording: Recording): z.infer<typeof recordingSchema> => ({
  recordingId: recording.id,
  botId: recording.botId,
  status: recording.status,
  createdAt: recording.createdAt,
  startedAt: recording.startedAt,
  completedAt: recording.completedAt,
  expiresAt: recording.expiresAt,
  media: Object.entries(recording.mediaShortcuts).flatMap(([kind, value]) => {
    const parsed = z
      .object({
        id: z.string(),
        status: z.object({ code: z.string() }),
        format: z.string().optional()
      })
      .safeParse(value);
    return parsed.success
      ? [
          {
            mediaId: parsed.data.id,
            kind,
            status: parsed.data.status.code,
            format: parsed.data.format ?? null
          }
        ]
      : [];
  })
});
