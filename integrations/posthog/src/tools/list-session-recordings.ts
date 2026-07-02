import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let recordingOutput = z.object({
  recordingId: z.string().describe('Session recording ID'),
  distinctId: z.string().optional().describe('Distinct ID of the user who was recorded'),
  startTime: z.string().optional().describe('Recording start time'),
  endTime: z.string().optional().describe('Recording end time'),
  duration: z.number().optional().describe('Recording duration in seconds'),
  activeSeconds: z.number().optional().describe('Active time in seconds'),
  clickCount: z.number().optional().describe('Number of clicks in the recording'),
  keypressCount: z.number().optional().describe('Number of keypresses in the recording'),
  pageCount: z.number().optional().describe('Number of pages visited')
});

export let listSessionRecordingsTool = SlateTool.create(spec, {
  name: 'List Session Recordings',
  key: 'list_session_recordings',
  description: `List session recording metadata. Supports filtering by person, date range, and pagination.
Note: This returns metadata only, not the raw replay data. Use the PostHog UI to view full replays.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      personId: z.string().optional().describe('Filter recordings by person ID'),
      dateFrom: z.string().optional().describe('ISO 8601 start date filter'),
      dateTo: z.string().optional().describe('ISO 8601 end date filter'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      recordings: z.array(recordingOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listSessionRecordings({
      personId: ctx.input.personId,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let recordings = (data.results || []).map((r: any) => ({
      recordingId: String(r.id),
      distinctId: r.distinct_id,
      startTime: r.start_time,
      endTime: r.end_time,
      duration: r.recording_duration,
      activeSeconds: r.active_seconds,
      clickCount: r.click_count,
      keypressCount: r.keypress_count,
      pageCount: r.page_count
    }));

    return {
      output: { recordings, hasMore: !!data.next },
      message: `Found **${recordings.length}** session recording(s).`
    };
  })
  .build();

export let getSessionRecordingTool = SlateTool.create(spec, {
  name: 'Get Session Recording',
  key: 'get_session_recording',
  description: `Retrieve metadata about a specific session recording by its ID.
Returns timing, activity metrics, and user information. Does not include the raw replay JSON.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordingId: z.string().describe('Session recording ID')
    })
  )
  .output(recordingOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let r = await client.getSessionRecording(ctx.input.recordingId);

    return {
      output: {
        recordingId: String(r.id),
        distinctId: r.distinct_id,
        startTime: r.start_time,
        endTime: r.end_time,
        duration: r.recording_duration,
        activeSeconds: r.active_seconds,
        clickCount: r.click_count,
        keypressCount: r.keypress_count,
        pageCount: r.page_count
      },
      message: `Retrieved session recording **${r.id}** (${r.recording_duration ? `${Math.round(r.recording_duration)}s` : 'unknown duration'}).`
    };
  })
  .build();
