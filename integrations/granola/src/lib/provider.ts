import { z } from 'zod';
import { granolaResponseError } from './errors';
import { GRANOLA_FOLDER_ID_PATTERN, GRANOLA_MEETING_ID_PATTERN } from './schemas';

let providerUserSchema = z.object({
  name: z.string().nullable(),
  email: z.string()
});

let providerFolderSchema = z.object({
  id: z.string().regex(GRANOLA_FOLDER_ID_PATTERN),
  name: z.string(),
  parent_folder_id: z.string().regex(GRANOLA_FOLDER_ID_PATTERN).nullable()
});

let providerMeetingSummarySchema = z.object({
  id: z.string().regex(GRANOLA_MEETING_ID_PATTERN),
  title: z.string().nullable(),
  owner: providerUserSchema,
  created_at: z.string().min(1),
  updated_at: z.string().min(1)
});

let providerCalendarEventSchema = z.object({
  event_title: z.string().nullable(),
  invitees: z.array(
    z.object({
      email: z.string()
    })
  ),
  organiser: z.string().nullable(),
  calendar_event_id: z.string().nullable(),
  scheduled_start_time: z.string().nullable(),
  scheduled_end_time: z.string().nullable()
});

let providerDetailedMeetingSchema = providerMeetingSummarySchema.extend({
  web_url: z.string().min(1),
  calendar_event: providerCalendarEventSchema.nullable(),
  attendees: z.array(providerUserSchema),
  folder_membership: z.array(providerFolderSchema),
  summary_text: z.string(),
  summary_markdown: z.string().nullable(),
  private_notes_text: z.string().nullable(),
  private_notes_markdown: z.string().nullable()
});

let providerTranscriptItemSchema = z.object({
  speaker: z.object({
    source: z
      .string()
      .min(1)
      .describe(
        'Speaker source. Current documented values are microphone and speaker; Granola may add more values.'
      ),
    attribution: z.enum(['me', 'them']).optional(),
    diarization_label: z.string().optional(),
    name: z.string().optional()
  }),
  text: z.string(),
  start_time: z.string().min(1),
  end_time: z.string().min(1)
});

export const providerFolderListSchema = z.object({
  folders: z.array(providerFolderSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});

export const providerMeetingListSchema = z.object({
  notes: z.array(providerMeetingSummarySchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});

export const providerTranscriptPageSchema = z.object({
  transcript: z.array(providerTranscriptItemSchema),
  hasMore: z.boolean(),
  cursor: z.string().nullable()
});

export const parseProviderResponse = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  operation: string
): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) throw granolaResponseError(operation);
  return parsed.data;
};

export const parseDetailedMeeting = (value: unknown, operation: string) =>
  parseProviderResponse(providerDetailedMeetingSchema, value, operation);

export const mapFolder = (folder: z.infer<typeof providerFolderSchema>) => ({
  id: folder.id,
  name: folder.name,
  parentFolderId: folder.parent_folder_id
});

export const mapMeetingSummary = (meeting: z.infer<typeof providerMeetingSummarySchema>) => ({
  id: meeting.id,
  title: meeting.title,
  owner: meeting.owner,
  createdAt: meeting.created_at,
  updatedAt: meeting.updated_at
});

export const mapDetailedMeeting = (
  meeting: z.infer<typeof providerDetailedMeetingSchema>
) => ({
  ...mapMeetingSummary(meeting),
  webUrl: meeting.web_url,
  calendarEvent:
    meeting.calendar_event === null
      ? null
      : {
          eventTitle: meeting.calendar_event.event_title,
          invitees: meeting.calendar_event.invitees,
          organiser: meeting.calendar_event.organiser,
          calendarEventId: meeting.calendar_event.calendar_event_id,
          scheduledStartTime: meeting.calendar_event.scheduled_start_time,
          scheduledEndTime: meeting.calendar_event.scheduled_end_time
        },
  attendees: meeting.attendees,
  folderMembership: meeting.folder_membership.map(mapFolder),
  summaryText: meeting.summary_text,
  summaryMarkdown: meeting.summary_markdown,
  privateNotesText: meeting.private_notes_text,
  privateNotesMarkdown: meeting.private_notes_markdown
});

export type DetailedMeeting = ReturnType<typeof mapDetailedMeeting>;

export const mapTranscriptItem = (item: z.infer<typeof providerTranscriptItemSchema>) => ({
  speaker: {
    source: item.speaker.source,
    ...(item.speaker.attribution === undefined
      ? {}
      : { attribution: item.speaker.attribution }),
    ...(item.speaker.diarization_label === undefined
      ? {}
      : { diarizationLabel: item.speaker.diarization_label }),
    ...(item.speaker.name === undefined ? {} : { name: item.speaker.name })
  },
  text: item.text,
  startTime: item.start_time,
  endTime: item.end_time
});
