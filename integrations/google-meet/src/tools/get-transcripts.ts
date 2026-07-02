import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

let transcriptSchema = z.object({
  transcriptName: z.string().describe('Resource name of the transcript'),
  state: z.string().optional().describe('Current state: STARTED, ENDED, or FILE_GENERATED'),
  startTime: z.string().optional().describe('When transcription started'),
  endTime: z.string().optional().describe('When transcription ended'),
  docsId: z.string().optional().describe('Google Docs document ID for the transcript'),
  docsUri: z.string().optional().describe('URI to view the transcript document')
});

let transcriptEntrySchema = z.object({
  entryName: z.string().describe('Resource name of the entry'),
  participantName: z.string().optional().describe('Resource name of the speaking participant'),
  text: z.string().optional().describe('Transcribed text'),
  languageCode: z.string().optional().describe('Language code (e.g., "en-US")'),
  startTime: z.string().optional().describe('When the entry started'),
  endTime: z.string().optional().describe('When the entry ended')
});

let mapTranscriptEntry = (e: any) => ({
  entryName: e.name || '',
  participantName: e.participant,
  text: e.text,
  languageCode: e.languageCode,
  startTime: e.startTime,
  endTime: e.endTime
});

export let listTranscriptsTool = SlateTool.create(spec, {
  name: 'List Transcripts',
  key: 'list_transcripts',
  description: `List transcripts from a conference record. Returns metadata including state, timestamps, and Google Docs references. Transcripts are saved as Google Docs in the organizer's Drive.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.listTranscripts)
  .input(
    z.object({
      conferenceRecordName: z
        .string()
        .describe('Conference record resource name (e.g., "conferenceRecords/abc123")'),
      pageSize: z.number().optional().describe('Maximum number of transcripts to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      transcripts: z.array(transcriptSchema),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let result = await client.listTranscripts(
      ctx.input.conferenceRecordName,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let transcripts = result.transcripts.map(t => ({
      transcriptName: t.name || '',
      state: t.state,
      startTime: t.startTime,
      endTime: t.endTime,
      docsId: t.docsDestination?.document,
      docsUri: t.docsDestination?.exportUri
    }));

    return {
      output: {
        transcripts,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${transcripts.length}** transcript(s).`
    };
  })
  .build();

export let getTranscriptTool = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieve metadata for a specific transcript including its state and Google Docs location.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getTranscript)
  .input(
    z.object({
      transcriptName: z
        .string()
        .describe(
          'Transcript resource name (e.g., "conferenceRecords/abc123/transcripts/def456")'
        )
    })
  )
  .output(transcriptSchema)
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let t = await client.getTranscript(ctx.input.transcriptName);

    return {
      output: {
        transcriptName: t.name || '',
        state: t.state,
        startTime: t.startTime,
        endTime: t.endTime,
        docsId: t.docsDestination?.document,
        docsUri: t.docsDestination?.exportUri
      },
      message: `Retrieved transcript **${t.name}** (state: ${t.state}).`
    };
  })
  .build();

export let getTranscriptEntryTool = SlateTool.create(spec, {
  name: 'Get Transcript Entry',
  key: 'get_transcript_entry',
  description: `Retrieve one structured transcript entry by resource name. Use this after listing transcript entries when you need the exact speaker, text, language, and timestamps for one segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getTranscriptEntry)
  .input(
    z.object({
      transcriptEntryName: z
        .string()
        .describe(
          'Transcript entry resource name (e.g., "conferenceRecords/abc123/transcripts/def456/entries/ghi789")'
        )
    })
  )
  .output(transcriptEntrySchema)
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let entry = await client.getTranscriptEntry(ctx.input.transcriptEntryName);
    let output = mapTranscriptEntry(entry);

    return {
      output,
      message: `Retrieved transcript entry **${output.entryName}**.`
    };
  })
  .build();

export let listTranscriptEntriesTool = SlateTool.create(spec, {
  name: 'List Transcript Entries',
  key: 'list_transcript_entries',
  description: `List individual transcript entries from a transcript. Each entry contains the spoken text, the speaker's participant reference, language code, and timestamps. Useful for analyzing meeting conversations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.listTranscriptEntries)
  .input(
    z.object({
      transcriptName: z
        .string()
        .describe(
          'Transcript resource name (e.g., "conferenceRecords/abc123/transcripts/def456")'
        ),
      pageSize: z.number().optional().describe('Maximum number of entries to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      entries: z.array(transcriptEntrySchema),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let result = await client.listTranscriptEntries(
      ctx.input.transcriptName,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let entries = result.transcriptEntries.map(mapTranscriptEntry);

    return {
      output: {
        entries,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${entries.length}** transcript entry/entries.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
