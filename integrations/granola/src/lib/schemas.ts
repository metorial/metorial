import { z } from 'zod';

export const GRANOLA_MEETING_ID_PATTERN = /^not_[A-Za-z0-9]{14}$/;
export const GRANOLA_FOLDER_ID_PATTERN = /^fol_[A-Za-z0-9]{14}$/;

export const meetingIdSchema = z
  .string()
  .regex(GRANOLA_MEETING_ID_PATTERN, 'Granola meeting IDs use not_ plus 14 characters.');

export const folderIdSchema = z
  .string()
  .regex(GRANOLA_FOLDER_ID_PATTERN, 'Granola folder IDs use fol_ plus 14 characters.');

export const cursorSchema = z.string().min(1);
export const listPageSizeSchema = z.number().int().min(1).max(30).default(10);
export const transcriptPageSizeSchema = z.number().int().min(1).max(100).default(50);

let isoDateSchema = z.iso.date();
let rfc3339Schema = z.iso.datetime({ offset: true });

export const dateOrTimestampSchema = z
  .string()
  .refine(
    value => isoDateSchema.safeParse(value).success || rfc3339Schema.safeParse(value).success,
    'Use an ISO date (YYYY-MM-DD) or an RFC3339 timestamp with a timezone.'
  );

export const userSchema = z.object({
  name: z.string().nullable(),
  email: z.string()
});

export const folderSchema = z.object({
  id: folderIdSchema,
  name: z.string(),
  parentFolderId: folderIdSchema.nullable()
});

export const meetingSummarySchema = z.object({
  id: meetingIdSchema,
  title: z.string().nullable(),
  owner: userSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const calendarEventSchema = z.object({
  eventTitle: z.string().nullable(),
  invitees: z.array(
    z.object({
      email: z.string()
    })
  ),
  organiser: z.string().nullable(),
  calendarEventId: z.string().nullable(),
  scheduledStartTime: z.string().nullable(),
  scheduledEndTime: z.string().nullable()
});

export const detailedMeetingSchema = meetingSummarySchema.extend({
  webUrl: z.string(),
  calendarEvent: calendarEventSchema.nullable(),
  attendees: z.array(userSchema),
  folderMembership: z.array(folderSchema),
  summaryText: z.string(),
  summaryMarkdown: z.string().nullable(),
  privateNotesText: z.string().nullable(),
  privateNotesMarkdown: z.string().nullable()
});

export const transcriptItemSchema = z.object({
  speaker: z.object({
    source: z
      .string()
      .min(1)
      .describe(
        'Speaker source. Current documented values are microphone and speaker; Granola may add more values.'
      ),
    attribution: z.enum(['me', 'them']).optional(),
    diarizationLabel: z.string().optional(),
    name: z.string().optional()
  }),
  text: z.string(),
  startTime: z.string(),
  endTime: z.string()
});

export const listMeetingFoldersOutputSchema = z.object({
  folders: z.array(folderSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});

export const listMeetingsOutputSchema = z.object({
  meetings: z.array(meetingSummarySchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});

export const getMeetingsOutputSchema = z.object({
  meetings: z.array(detailedMeetingSchema)
});

export const getMeetingTranscriptOutputSchema = z.object({
  meetingId: meetingIdSchema,
  transcript: z.array(transcriptItemSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});
