import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

let recordingSchema = z.object({
  recordingName: z.string().describe('Resource name of the recording'),
  state: z.string().optional().describe('Current state: STARTED, ENDED, or FILE_GENERATED'),
  startTime: z.string().optional().describe('When the recording started'),
  endTime: z.string().optional().describe('When the recording ended'),
  driveFileId: z.string().optional().describe('Google Drive file ID for the MP4 recording'),
  playbackUri: z.string().optional().describe('URI to play back the recording in the browser')
});

export let listRecordingsTool = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description: `List recording resources from a conference record. Returns recording metadata including state, timestamps, and Google Drive file references. Recordings are saved as MP4 files in the organizer's Drive.`,
  instructions: [
    'Recordings are usually available shortly after a conference ends.',
    'Use the driveFileId with the Google Drive API to download the actual file.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.listRecordings)
  .input(
    z.object({
      conferenceRecordName: z
        .string()
        .describe('Conference record resource name (e.g., "conferenceRecords/abc123")'),
      pageSize: z.number().optional().describe('Maximum number of recordings to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      recordings: z.array(recordingSchema),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let result = await client.listRecordings(
      ctx.input.conferenceRecordName,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let recordings = result.recordings.map(r => ({
      recordingName: r.name || '',
      state: r.state,
      startTime: r.startTime,
      endTime: r.endTime,
      driveFileId: r.driveDestination?.file,
      playbackUri: r.driveDestination?.exportUri
    }));

    return {
      output: {
        recordings,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${recordings.length}** recording(s).`
    };
  })
  .build();

export let getRecordingTool = SlateTool.create(spec, {
  name: 'Get Recording',
  key: 'get_recording',
  description: `Retrieve metadata for a specific recording, including its state and Google Drive file location.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getRecording)
  .input(
    z.object({
      recordingName: z
        .string()
        .describe(
          'Recording resource name (e.g., "conferenceRecords/abc123/recordings/def456")'
        )
    })
  )
  .output(recordingSchema)
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let r = await client.getRecording(ctx.input.recordingName);

    return {
      output: {
        recordingName: r.name || '',
        state: r.state,
        startTime: r.startTime,
        endTime: r.endTime,
        driveFileId: r.driveDestination?.file,
        playbackUri: r.driveDestination?.exportUri
      },
      message: `Retrieved recording **${r.name}** (state: ${r.state}).`
    };
  })
  .build();
