import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let recordingSchema = z.object({
  recordingId: z.string().describe('Unique ID of the recording'),
  meetingId: z.string().optional().describe('Associated meeting ID'),
  scheduledMeetingId: z.string().optional().describe('Associated scheduled meeting ID'),
  meetingSeriesId: z.string().optional().describe('Associated meeting series ID'),
  topic: z.string().optional().describe('Recording topic/title'),
  createTime: z.string().optional().describe('When the recording was created'),
  timeRecorded: z.string().optional().describe('When the recording was made'),
  hostEmail: z.string().optional().describe('Email of the recording host'),
  siteUrl: z.string().optional().describe('Webex site URL'),
  durationSeconds: z.number().optional().describe('Duration in seconds'),
  sizeBytes: z.number().optional().describe('Size in bytes'),
  playbackUrl: z.string().optional().describe('URL to play back the recording'),
  downloadUrl: z.string().optional().describe('URL to download the recording'),
  format: z.string().optional().describe('Recording format (e.g. MP4)'),
  status: z.string().optional().describe('Recording status')
});

export let listRecordings = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description: `List meeting recordings. Filter by meeting ID, date range, host email, or site URL. Returns recording metadata including playback and download URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().optional().describe('Filter by meeting ID'),
      from: z.string().optional().describe('Start of date range (ISO 8601)'),
      to: z.string().optional().describe('End of date range (ISO 8601)'),
      hostEmail: z.string().optional().describe('Filter by host email (admin use)'),
      siteUrl: z.string().optional().describe('Filter by Webex site URL'),
      max: z.number().optional().describe('Maximum number of results (default 10)')
    })
  )
  .output(
    z.object({
      recordings: z.array(recordingSchema).describe('List of recordings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listRecordings({
      meetingId: ctx.input.meetingId,
      from: ctx.input.from,
      to: ctx.input.to,
      hostEmail: ctx.input.hostEmail,
      siteUrl: ctx.input.siteUrl,
      max: ctx.input.max
    });

    let items = result.items || [];
    let recordings = items.map((r: any) => ({
      recordingId: r.id,
      meetingId: r.meetingId,
      scheduledMeetingId: r.scheduledMeetingId,
      meetingSeriesId: r.meetingSeriesId,
      topic: r.topic,
      createTime: r.createTime,
      timeRecorded: r.timeRecorded,
      hostEmail: r.hostEmail,
      siteUrl: r.siteUrl,
      durationSeconds: r.durationSeconds,
      sizeBytes: r.sizeBytes,
      playbackUrl: r.playbackUrl,
      downloadUrl: r.downloadUrl,
      format: r.format,
      status: r.status
    }));

    return {
      output: { recordings },
      message: `Found **${recordings.length}** recording(s).`
    };
  })
  .build();

export let getRecording = SlateTool.create(spec, {
  name: 'Get Recording Details',
  key: 'get_recording',
  description: `Retrieve full details of a specific recording including playback URL, download URL, size, and duration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingId: z.string().describe('ID of the recording to retrieve'),
      hostEmail: z.string().optional().describe('Host email (admin use)')
    })
  )
  .output(recordingSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.getRecording(ctx.input.recordingId, {
      hostEmail: ctx.input.hostEmail
    });

    return {
      output: {
        recordingId: result.id,
        meetingId: result.meetingId,
        scheduledMeetingId: result.scheduledMeetingId,
        meetingSeriesId: result.meetingSeriesId,
        topic: result.topic,
        createTime: result.createTime,
        timeRecorded: result.timeRecorded,
        hostEmail: result.hostEmail,
        siteUrl: result.siteUrl,
        durationSeconds: result.durationSeconds,
        sizeBytes: result.sizeBytes,
        playbackUrl: result.playbackUrl,
        downloadUrl: result.downloadUrl,
        format: result.format,
        status: result.status
      },
      message: `Recording **${result.topic}** (${result.durationSeconds ? `${Math.round(result.durationSeconds / 60)} minutes` : 'unknown duration'}).`
    };
  })
  .build();
