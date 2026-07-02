import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let recordingEventsTrigger = SlateTrigger.create(spec, {
  name: 'Recording Events',
  key: 'recording_events',
  description:
    'Triggers when a recording file is generated for a conference. Polls conference records for new recordings with FILE_GENERATED state.'
})
  .scopes(googleMeetActionScopes.recordingEvents)
  .input(
    z.object({
      conferenceRecordName: z.string().describe('Conference record resource name'),
      recordingName: z.string().describe('Recording resource name'),
      state: z.string().describe('Recording state'),
      startTime: z.string().optional().describe('When the recording started'),
      endTime: z.string().optional().describe('When the recording ended'),
      driveFileId: z.string().optional().describe('Google Drive file ID'),
      playbackUri: z.string().optional().describe('Playback URI')
    })
  )
  .output(
    z.object({
      conferenceRecordName: z.string().describe('Conference record resource name'),
      recordingName: z.string().describe('Recording resource name'),
      state: z.string().describe('Recording state'),
      startTime: z.string().optional().describe('When the recording started'),
      endTime: z.string().optional().describe('When the recording ended'),
      driveFileId: z.string().optional().describe('Google Drive file ID for the MP4'),
      playbackUri: z.string().optional().describe('URI to play back the recording')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MeetClient({ token: ctx.auth.token });

      let knownRecordings = (ctx.state?.knownRecordings as string[] | undefined) || [];
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      // Get recent conference records
      let filter = lastPollTime ? `end_time>="${lastPollTime}"` : undefined;

      let records = await client.listConferenceRecords(filter, 20);
      let inputs: Array<{
        conferenceRecordName: string;
        recordingName: string;
        state: string;
        startTime?: string;
        endTime?: string;
        driveFileId?: string;
        playbackUri?: string;
      }> = [];

      let updatedKnownRecordings = [...knownRecordings];

      for (let record of records.conferenceRecords) {
        let recordName = record.name || '';
        let recordings = await client.listRecordings(recordName, 50);

        for (let recording of recordings.recordings) {
          let rName = recording.name || '';
          if (recording.state === 'FILE_GENERATED' && !knownRecordings.includes(rName)) {
            inputs.push({
              conferenceRecordName: recordName,
              recordingName: rName,
              state: recording.state,
              startTime: recording.startTime,
              endTime: recording.endTime,
              driveFileId: recording.driveDestination?.file,
              playbackUri: recording.driveDestination?.exportUri
            });
            updatedKnownRecordings.push(rName);
          }
        }
      }

      // Keep only the last 500 known recordings to prevent unbounded growth
      if (updatedKnownRecordings.length > 500) {
        updatedKnownRecordings = updatedKnownRecordings.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          knownRecordings: updatedKnownRecordings,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'recording.file_generated',
        id: ctx.input.recordingName,
        output: {
          conferenceRecordName: ctx.input.conferenceRecordName,
          recordingName: ctx.input.recordingName,
          state: ctx.input.state,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          driveFileId: ctx.input.driveFileId,
          playbackUri: ctx.input.playbackUri
        }
      };
    }
  })
  .build();
