import { z } from 'zod';
import { firefliesServiceError } from '../lib/errors';

let nullableString = (value: unknown) => (value == null ? null : String(value));
let nullableNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
let nullableBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : value == null ? null : Boolean(value);
let stringArrayOrNull = (value: unknown) =>
  Array.isArray(value) ? value.map(item => String(item)) : null;

export let appOutputSchema = z.object({
  transcriptId: z.string().nullable(),
  userId: z.string().nullable(),
  appId: z.string().nullable(),
  createdAt: z.string().nullable(),
  title: z.string().nullable(),
  prompt: z.string().nullable(),
  response: z.string().nullable()
});

export let userGroupSchema = z.object({
  groupId: z.string().nullable(),
  name: z.string().nullable(),
  handle: z.string().nullable(),
  members: z
    .array(
      z.object({
        userId: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable()
      })
    )
    .nullable()
});

export let userSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  email: z.string().nullable().describe('User email address'),
  name: z.string().nullable().describe('User full name'),
  numTranscripts: z.number().nullable().describe('Total number of transcripts'),
  recentMeeting: z.string().nullable().describe('Most recent meeting date'),
  recentTranscript: z.string().nullable().describe('Most recent transcript ID'),
  minutesConsumed: z.number().nullable().describe('Transcription minutes consumed'),
  isAdmin: z.boolean().nullable().describe('Whether the user has admin privileges'),
  integrations: z.array(z.string()).nullable().describe('List of connected integrations'),
  isCalendarInSync: z
    .boolean()
    .nullable()
    .describe('Whether the user has a valid synced calendar connection'),
  userGroups: z.array(userGroupSchema).nullable().describe('User groups this user belongs to')
});

export let summarySchema = z.object({
  keywords: z.any().nullable(),
  actionItems: z.any().nullable(),
  outline: z.any().nullable(),
  shorthandBullet: z.any().nullable(),
  overview: z.string().nullable(),
  notes: z.string().nullable(),
  bulletGist: z.any().nullable(),
  gist: z.string().nullable(),
  shortSummary: z.string().nullable(),
  shortOverview: z.string().nullable(),
  meetingType: z.string().nullable(),
  topicsDiscussed: z.array(z.string()).nullable(),
  transcriptChapters: z.array(z.string()).nullable(),
  extendedSections: z
    .array(
      z.object({
        title: z.string().nullable(),
        content: z.string().nullable()
      })
    )
    .nullable()
});

export let channelSchema = z.object({
  channelId: z.string().describe('Unique channel identifier'),
  title: z.string().nullable().describe('Channel title'),
  isPrivate: z.boolean().nullable().describe('Whether the channel is private'),
  createdBy: z.string().nullable().describe('User who created the channel'),
  createdAt: z.string().nullable().describe('Channel creation date'),
  updatedAt: z.string().nullable().describe('Last update date'),
  members: z
    .array(
      z.object({
        userId: z.string().nullable().describe('Member user ID'),
        email: z.string().nullable().describe('Member email'),
        name: z.string().nullable().describe('Member name')
      })
    )
    .nullable()
    .describe('Channel members')
});

export let transcriptListItemSchema = z.object({
  transcriptId: z.string().describe('Unique transcript identifier'),
  title: z.string().nullable().describe('Meeting title'),
  date: z.string().nullable().describe('Meeting date'),
  duration: z.number().nullable().describe('Meeting duration in minutes'),
  organizerEmail: z.string().nullable().describe('Organizer email'),
  participants: z.array(z.string()).nullable().describe('List of participant emails'),
  firefliesUsers: z
    .array(z.string())
    .nullable()
    .describe('Fireflies users who participated in the meeting'),
  workspaceUsers: z
    .array(z.string())
    .nullable()
    .describe('Workspace teammates who participated in the meeting'),
  privacy: z.string().nullable().describe('Privacy level of the transcript'),
  transcriptUrl: z.string().nullable().describe('URL to view the transcript'),
  audioUrl: z.string().nullable().describe('URL to the audio recording'),
  videoUrl: z.string().nullable().describe('URL to the video recording'),
  calendarId: z.string().nullable().describe('Calendar provider event ID'),
  calId: z.string().nullable().describe('Calendar event ID including recurrence timestamp'),
  calendarType: z.string().nullable().describe('Calendar provider name'),
  meetingLink: z.string().nullable().describe('Original meeting link'),
  isLive: z.boolean().nullable().describe('Whether the meeting is currently live'),
  meetingInfo: z.any().nullable().describe('Meeting processing metadata'),
  summary: summarySchema.nullable().describe('AI-generated meeting summary'),
  appOutputs: z.array(appOutputSchema).nullable().describe('Recent AI App outputs'),
  channels: z
    .array(
      z.object({
        channelId: z.string().nullable(),
        title: z.string().nullable()
      })
    )
    .nullable()
    .describe('Channels this meeting belongs to'),
  sharedWith: z
    .array(
      z.object({
        email: z.string().nullable(),
        name: z.string().nullable(),
        photoUrl: z.string().nullable(),
        expiresAt: z.string().nullable()
      })
    )
    .nullable()
    .describe('Users with shared access to this meeting')
});

export let transcriptDetailSchema = transcriptListItemSchema.extend({
  hostEmail: z.string().nullable().describe('Deprecated host email field'),
  user: userSchema.nullable().describe('User Fred recorded on behalf of'),
  speakers: z
    .array(
      z.object({
        speakerId: z.number().nullable().describe('Speaker identifier'),
        name: z.string().nullable().describe('Speaker name')
      })
    )
    .nullable()
    .describe('Identified speakers in the meeting'),
  analytics: z.any().nullable().describe('Meeting analytics'),
  sentences: z
    .array(
      z.object({
        index: z.number().nullable().describe('Sentence index in the transcript'),
        text: z.string().nullable().describe('Processed sentence text'),
        rawText: z.string().nullable().describe('Raw unprocessed text'),
        startTime: z.number().nullable().describe('Start time in seconds'),
        endTime: z.number().nullable().describe('End time in seconds'),
        speakerId: z.number().nullable().describe('Speaker identifier'),
        speakerName: z.string().nullable().describe('Speaker name'),
        aiFilters: z.any().nullable().describe('AI filters detected for this sentence')
      })
    )
    .nullable()
    .describe('Transcript sentences with timestamps and speaker attribution'),
  attendees: z
    .array(
      z.object({
        displayName: z.string().nullable(),
        email: z.string().nullable(),
        phoneNumber: z.string().nullable(),
        name: z.string().nullable(),
        location: z.string().nullable()
      })
    )
    .nullable()
    .describe('Meeting attendees'),
  attendance: z
    .array(
      z.object({
        name: z.string().nullable(),
        joinTime: z.string().nullable(),
        leaveTime: z.string().nullable()
      })
    )
    .nullable()
    .describe('Meeting attendance with join/leave times'),
  sentenceMode: z
    .enum(['attachment', 'inline', 'omit'])
    .describe('How transcript sentences were returned for this response'),
  sentenceFormat: z
    .enum(['text', 'jsonl'])
    .nullable()
    .describe('Format used when sentenceMode is attachment'),
  sentenceCount: z.number().describe('Number of transcript sentences available'),
  attachmentCount: z.number().describe('Number of attachments returned by this tool')
});

export let biteSchema = z.object({
  biteId: z.string().describe('Unique soundbite identifier'),
  transcriptId: z.string().nullable().describe('Transcript the soundbite belongs to'),
  name: z.string().nullable().describe('Soundbite name'),
  thumbnail: z.string().nullable().describe('Thumbnail URL'),
  preview: z.string().nullable().describe('Preview media URL'),
  status: z.string().nullable().describe('Processing status'),
  summary: z.string().nullable().describe('Soundbite summary'),
  userId: z.string().nullable().describe('Creator user ID'),
  startTime: z.any().nullable().describe('Soundbite start time'),
  endTime: z.any().nullable().describe('Soundbite end time'),
  summaryStatus: z.string().nullable().describe('Summary generation status'),
  mediaType: z.string().nullable().describe('Soundbite media type'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  createdFrom: z.any().nullable().describe('Source metadata'),
  captions: z.any().nullable().describe('Caption segments'),
  sources: z.any().nullable().describe('Media sources'),
  privacies: z.array(z.string()).nullable().describe('Visibility settings'),
  user: z.any().nullable().describe('Creator metadata')
});

export let mapAppOutput = (output: any) => ({
  transcriptId: nullableString(output?.transcript_id),
  userId: nullableString(output?.user_id),
  appId: nullableString(output?.app_id),
  createdAt: nullableString(output?.created_at),
  title: nullableString(output?.title),
  prompt: nullableString(output?.prompt),
  response: nullableString(output?.response)
});

export let mapUserGroup = (group: any) => ({
  groupId: nullableString(group?.id),
  name: nullableString(group?.name),
  handle: nullableString(group?.handle),
  members: Array.isArray(group?.members)
    ? group.members.map((member: any) => ({
        userId: nullableString(member?.user_id),
        firstName: nullableString(member?.first_name),
        lastName: nullableString(member?.last_name),
        email: nullableString(member?.email)
      }))
    : null
});

export let mapUser = (user: any) => ({
  userId: String(user?.user_id ?? ''),
  email: nullableString(user?.email),
  name: nullableString(user?.name),
  numTranscripts: nullableNumber(user?.num_transcripts),
  recentMeeting: nullableString(user?.recent_meeting),
  recentTranscript: nullableString(user?.recent_transcript),
  minutesConsumed: nullableNumber(user?.minutes_consumed),
  isAdmin: nullableBoolean(user?.is_admin),
  integrations: stringArrayOrNull(user?.integrations),
  isCalendarInSync: nullableBoolean(user?.is_calendar_in_sync),
  userGroups: Array.isArray(user?.user_groups)
    ? user.user_groups.map((group: any) => mapUserGroup(group))
    : null
});

export let mapSummary = (summary: any) =>
  summary
    ? {
        keywords: summary.keywords ?? null,
        actionItems: summary.action_items ?? null,
        outline: summary.outline ?? null,
        shorthandBullet: summary.shorthand_bullet ?? null,
        overview: nullableString(summary.overview),
        notes: nullableString(summary.notes),
        bulletGist: summary.bullet_gist ?? null,
        gist: nullableString(summary.gist),
        shortSummary: nullableString(summary.short_summary),
        shortOverview: nullableString(summary.short_overview),
        meetingType: nullableString(summary.meeting_type),
        topicsDiscussed: stringArrayOrNull(summary.topics_discussed),
        transcriptChapters: stringArrayOrNull(summary.transcript_chapters),
        extendedSections: Array.isArray(summary.extended_sections)
          ? summary.extended_sections.map((section: any) => ({
              title: nullableString(section?.title),
              content: nullableString(section?.content)
            }))
          : null
      }
    : null;

export let mapChannel = (channel: any) => ({
  channelId: String(channel?.id ?? ''),
  title: nullableString(channel?.title),
  isPrivate: nullableBoolean(channel?.is_private),
  createdBy: nullableString(channel?.created_by),
  createdAt: nullableString(channel?.created_at),
  updatedAt: nullableString(channel?.updated_at),
  members: Array.isArray(channel?.members)
    ? channel.members.map((member: any) => ({
        userId: nullableString(member?.user_id),
        email: nullableString(member?.email),
        name: nullableString(member?.name)
      }))
    : null
});

export let mapTranscriptListItem = (transcript: any) => ({
  transcriptId: String(transcript?.id ?? ''),
  title: nullableString(transcript?.title),
  date: nullableString(transcript?.date),
  duration: nullableNumber(transcript?.duration),
  organizerEmail: nullableString(transcript?.organizer_email),
  participants: stringArrayOrNull(transcript?.participants),
  firefliesUsers: stringArrayOrNull(transcript?.fireflies_users),
  workspaceUsers: stringArrayOrNull(transcript?.workspace_users),
  privacy: nullableString(transcript?.privacy),
  transcriptUrl: nullableString(transcript?.transcript_url),
  audioUrl: nullableString(transcript?.audio_url),
  videoUrl: nullableString(transcript?.video_url),
  calendarId: nullableString(transcript?.calendar_id),
  calId: nullableString(transcript?.cal_id),
  calendarType: nullableString(transcript?.calendar_type),
  meetingLink: nullableString(transcript?.meeting_link),
  isLive: nullableBoolean(transcript?.is_live),
  meetingInfo: transcript?.meeting_info ?? null,
  summary: mapSummary(transcript?.summary),
  appOutputs: Array.isArray(transcript?.apps_preview?.outputs)
    ? transcript.apps_preview.outputs.map((output: any) => mapAppOutput(output))
    : null,
  channels: Array.isArray(transcript?.channels)
    ? transcript.channels.map((channel: any) => ({
        channelId: nullableString(channel?.id),
        title: nullableString(channel?.title)
      }))
    : null,
  sharedWith: Array.isArray(transcript?.shared_with)
    ? transcript.shared_with.map((share: any) => ({
        email: nullableString(share?.email),
        name: nullableString(share?.name),
        photoUrl: nullableString(share?.photo_url),
        expiresAt: nullableString(share?.expires_at)
      }))
    : null
});

export let mapTranscriptDetail = (transcript: any) => ({
  ...mapTranscriptListItem(transcript),
  hostEmail: nullableString(transcript?.host_email),
  user: transcript?.user ? mapUser(transcript.user) : null,
  speakers: Array.isArray(transcript?.speakers)
    ? transcript.speakers.map((speaker: any) => ({
        speakerId: nullableNumber(speaker?.id),
        name: nullableString(speaker?.name)
      }))
    : null,
  analytics: transcript?.analytics ?? null,
  sentences: Array.isArray(transcript?.sentences)
    ? transcript.sentences.map((sentence: any) => ({
        index: nullableNumber(sentence?.index),
        text: nullableString(sentence?.text),
        rawText: nullableString(sentence?.raw_text),
        startTime: nullableNumber(sentence?.start_time),
        endTime: nullableNumber(sentence?.end_time),
        speakerId: nullableNumber(sentence?.speaker_id),
        speakerName: nullableString(sentence?.speaker_name),
        aiFilters: sentence?.ai_filters ?? null
      }))
    : null,
  attendees: Array.isArray(transcript?.meeting_attendees)
    ? transcript.meeting_attendees.map((attendee: any) => ({
        displayName: nullableString(attendee?.displayName),
        email: nullableString(attendee?.email),
        phoneNumber: nullableString(attendee?.phoneNumber),
        name: nullableString(attendee?.name),
        location: nullableString(attendee?.location)
      }))
    : null,
  attendance: Array.isArray(transcript?.meeting_attendance)
    ? transcript.meeting_attendance.map((attendance: any) => ({
        name: nullableString(attendance?.name),
        joinTime: nullableString(attendance?.join_time),
        leaveTime: nullableString(attendance?.leave_time)
      }))
    : null
});

export let mapBite = (bite: any) => ({
  biteId: String(bite?.id ?? ''),
  transcriptId: nullableString(bite?.transcript_id),
  name: nullableString(bite?.name),
  thumbnail: nullableString(bite?.thumbnail),
  preview: nullableString(bite?.preview),
  status: nullableString(bite?.status),
  summary: nullableString(bite?.summary),
  userId: nullableString(bite?.user_id),
  startTime: bite?.start_time ?? null,
  endTime: bite?.end_time ?? null,
  summaryStatus: nullableString(bite?.summary_status),
  mediaType: nullableString(bite?.media_type),
  createdAt: nullableString(bite?.created_at),
  createdFrom: bite?.created_from ?? null,
  captions: bite?.captions ?? null,
  sources: bite?.sources ?? null,
  privacies: stringArrayOrNull(bite?.privacies),
  user: bite?.user ?? null
});

export let assertLimit = (value: number | undefined, label: string, max: number) => {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw firefliesServiceError(`${label} must be an integer between 1 and ${max}.`);
  }
};

export let assertNonNegativeSkip = (value: number | undefined) => {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw firefliesServiceError('skip must be a non-negative integer.');
  }
};

export let assertNonEmpty = (value: string | undefined, label: string) => {
  if (!value || value.trim().length === 0) {
    throw firefliesServiceError(`${label} is required.`);
  }
};

export let assertEmailList = (emails: string[], max: number) => {
  if (emails.length === 0) {
    throw firefliesServiceError('Provide at least one email address.');
  }
  if (emails.length > max) {
    throw firefliesServiceError(`Provide at most ${max} email addresses.`);
  }
};
