import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let transcriptEventsTrigger = SlateTrigger.create(spec, {
  name: 'Transcript Events',
  key: 'transcript_events',
  description:
    'Triggers when a transcript file is generated for a conference. Polls conference records for new transcripts with FILE_GENERATED state.'
})
  .scopes(googleMeetActionScopes.transcriptEvents)
  .input(
    z.object({
      conferenceRecordName: z.string().describe('Conference record resource name'),
      transcriptName: z.string().describe('Transcript resource name'),
      state: z.string().describe('Transcript state'),
      startTime: z.string().optional().describe('When transcription started'),
      endTime: z.string().optional().describe('When transcription ended'),
      docsId: z.string().optional().describe('Google Docs document ID'),
      docsUri: z.string().optional().describe('URI to view the transcript document')
    })
  )
  .output(
    z.object({
      conferenceRecordName: z.string().describe('Conference record resource name'),
      transcriptName: z.string().describe('Transcript resource name'),
      state: z.string().describe('Transcript state'),
      startTime: z.string().optional().describe('When transcription started'),
      endTime: z.string().optional().describe('When transcription ended'),
      docsId: z.string().optional().describe('Google Docs document ID'),
      docsUri: z.string().optional().describe('URI to view the transcript')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MeetClient({ token: ctx.auth.token });

      let knownTranscripts = (ctx.state?.knownTranscripts as string[] | undefined) || [];
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let filter = lastPollTime ? `end_time>="${lastPollTime}"` : undefined;

      let records = await client.listConferenceRecords(filter, 20);
      let inputs: Array<{
        conferenceRecordName: string;
        transcriptName: string;
        state: string;
        startTime?: string;
        endTime?: string;
        docsId?: string;
        docsUri?: string;
      }> = [];

      let updatedKnownTranscripts = [...knownTranscripts];

      for (let record of records.conferenceRecords) {
        let recordName = record.name || '';
        let transcripts = await client.listTranscripts(recordName, 50);

        for (let transcript of transcripts.transcripts) {
          let tName = transcript.name || '';
          if (transcript.state === 'FILE_GENERATED' && !knownTranscripts.includes(tName)) {
            inputs.push({
              conferenceRecordName: recordName,
              transcriptName: tName,
              state: transcript.state,
              startTime: transcript.startTime,
              endTime: transcript.endTime,
              docsId: transcript.docsDestination?.document,
              docsUri: transcript.docsDestination?.exportUri
            });
            updatedKnownTranscripts.push(tName);
          }
        }
      }

      // Keep only the last 500 known transcripts to prevent unbounded growth
      if (updatedKnownTranscripts.length > 500) {
        updatedKnownTranscripts = updatedKnownTranscripts.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          knownTranscripts: updatedKnownTranscripts,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'transcript.file_generated',
        id: ctx.input.transcriptName,
        output: {
          conferenceRecordName: ctx.input.conferenceRecordName,
          transcriptName: ctx.input.transcriptName,
          state: ctx.input.state,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          docsId: ctx.input.docsId,
          docsUri: ctx.input.docsUri
        }
      };
    }
  })
  .build();
