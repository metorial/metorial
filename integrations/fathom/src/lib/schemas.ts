import { createApiServiceError } from 'slates';
import { z } from 'zod';

let namedPerson = z
  .object({
    name: z.string().optional(),
    display_name: z.string().optional(),
    email: z.string()
  })
  .passthrough()
  .refine(person => person.name !== undefined || person.display_name !== undefined, {
    message: 'Missing person name'
  });
let invitee = z
  .object({
    name: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    email: z.string().nullable()
  })
  .passthrough()
  .refine(person => person.name !== undefined || person.display_name !== undefined, {
    message: 'Missing invitee name'
  });

export let transcriptEntryResponseSchema = z
  .object({
    speaker: z
      .object({
        display_name: z.string(),
        matched_calendar_invitee_email: z.string().nullable().optional()
      })
      .passthrough(),
    text: z.string(),
    timestamp: z.string()
  })
  .passthrough();
export let summaryResponseSchema = z
  .object({
    template_name: z.string().nullable(),
    markdown_formatted: z.string().nullable()
  })
  .passthrough();
export let actionItemResponseSchema = z
  .object({
    description: z.string(),
    assignee: z
      .object({
        name: z.string().nullable(),
        email: z.string().nullable(),
        team: z.string().nullable()
      })
      .passthrough()
      .nullable(),
    completed: z.boolean(),
    recording_playback_url: z.string().optional(),
    url: z.string().nullable().optional(),
    user_generated: z.boolean().optional(),
    recording_timestamp: z.string().optional()
  })
  .passthrough()
  .refine(item => item.recording_playback_url !== undefined || item.url !== undefined, {
    message: 'Missing action item recording URL'
  });
export let meetingResponseSchema = z
  .object({
    title: z.string(),
    meeting_title: z.string().nullable(),
    recording_id: z.number().int().positive().safe(),
    url: z.string(),
    share_url: z.string(),
    created_at: z.string(),
    scheduled_start_time: z.string().nullable(),
    scheduled_end_time: z.string().nullable(),
    recording_start_time: z.string().nullable(),
    recording_end_time: z.string().nullable(),
    calendar_invitees_domains_type: z.string().nullable(),
    transcript_language: z.string().nullable(),
    recorded_by: namedPerson.nullable(),
    calendar_invitees: z.array(invitee),
    transcript: z.array(transcriptEntryResponseSchema).nullable().optional(),
    default_summary: summaryResponseSchema.nullable().optional(),
    action_items: z.array(actionItemResponseSchema).nullable().optional(),
    crm_matches: z.record(z.string(), z.unknown()).nullable().optional(),
    highlights: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    meeting_type: z.string().nullable().optional(),
    meeting_url: z.string().nullable().optional(),
    shared_with: z.string().optional()
  })
  .passthrough();
export let teamResponseSchema = z
  .object({ name: z.string(), created_at: z.string() })
  .passthrough();
export let memberResponseSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    created_at: z.string()
  })
  .passthrough();
export let meetingTypeResponseSchema = z
  .object({
    name: z.string(),
    status: z.enum(['active', 'inactive']),
    created_at: z.string()
  })
  .passthrough();
export let pageResponseSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({
      limit: z.number().nullable(),
      next_cursor: z.string().nullable(),
      items: z.array(item)
    })
    .passthrough();
export let parseFathomResponse = <T extends z.ZodType>(
  schema: T,
  data: unknown,
  operation: string
): z.infer<T> => {
  let result = schema.safeParse(data);
  if (!result.success) {
    let path = result.error.issues[0]?.path.map(String).join('.') || 'response';
    throw createApiServiceError(`Fathom returned invalid ${operation} data at ${path}.`, {
      reason: 'fathom_invalid_response'
    });
  }
  return result.data;
};

export let transcriptEntrySchema = z.object({
  speakerName: z.string().describe('Display name of the speaker'),
  speakerEmail: z
    .string()
    .nullable()
    .optional()
    .describe('Matched calendar invitee email of the speaker, when supplied'),
  text: z.string().describe('Spoken text'),
  timestamp: z.string().describe('Timestamp in HH:MM:SS format'),
  raw: z.unknown().optional().describe('Original transcript entry')
});
export let summarySchema = z.object({
  templateName: z.string().nullable().describe('Name of the summary template used'),
  content: z.string().nullable().describe('AI-generated summary in Markdown format')
});
export let actionItemSchema = z.object({
  description: z.string().describe('Description of the action item'),
  assigneeName: z.string().nullable().describe('Name of the assignee'),
  assigneeEmail: z.string().nullable().describe('Email of the assignee'),
  assigneeTeam: z.string().nullable().describe('Team of the assignee'),
  completed: z.boolean().describe('Whether the action item is completed'),
  momentUrl: z.string().nullable().describe('Link to the relevant moment in the recording'),
  userGenerated: z.boolean().optional().describe('Whether a user added the action item'),
  recordingTimestamp: z.string().optional().describe('Recording timestamp in HH:MM:SS format'),
  raw: z.unknown().optional().describe('Original action item')
});
export let mapTranscriptEntry = (entry: z.infer<typeof transcriptEntryResponseSchema>) => ({
  speakerName: entry.speaker.display_name,
  ...(entry.speaker.matched_calendar_invitee_email === undefined
    ? {}
    : { speakerEmail: entry.speaker.matched_calendar_invitee_email }),
  text: entry.text,
  timestamp: entry.timestamp,
  raw: entry
});
export let mapActionItem = (item: z.infer<typeof actionItemResponseSchema>) => ({
  description: item.description,
  assigneeName: item.assignee === null ? null : item.assignee.name,
  assigneeEmail: item.assignee === null ? null : item.assignee.email,
  assigneeTeam: item.assignee === null ? null : item.assignee.team,
  completed: item.completed,
  momentUrl:
    item.recording_playback_url === undefined ? item.url! : item.recording_playback_url,
  ...(item.user_generated === undefined ? {} : { userGenerated: item.user_generated }),
  ...(item.recording_timestamp === undefined
    ? {}
    : { recordingTimestamp: item.recording_timestamp }),
  raw: item
});
