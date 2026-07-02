import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let transcriptEntrySchema = z.object({
  speakerId: z.string().optional().describe('Identifier of the speaker'),
  topic: z.string().optional().describe('Topic associated with this segment'),
  sentences: z
    .array(
      z.object({
        start: z.number().optional().describe('Start time in seconds'),
        end: z.number().optional().describe('End time in seconds'),
        text: z.string().optional().describe('Transcribed text')
      })
    )
    .optional()
    .describe('Sentences in this transcript segment')
});

let callTranscriptSchema = z.object({
  callId: z.string().describe('ID of the call'),
  transcript: z.array(transcriptEntrySchema).describe('Transcript entries for the call')
});

export let getCallTranscripts = SlateTool.create(spec, {
  name: 'Get Call Transcripts',
  key: 'get_call_transcripts',
  description: `Retrieve full transcripts for Gong calls. Returns speaker-labeled, timestamped transcription data. Useful for NLP analysis, sentiment analysis, or reviewing conversation content.`,
  instructions: [
    'Provide either callIds or a date range (fromDateTime/toDateTime) to filter which transcripts to retrieve.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callIds: z
        .array(z.string())
        .optional()
        .describe('Specific call IDs to get transcripts for'),
      fromDateTime: z.string().optional().describe('Start of date range in ISO 8601 format'),
      toDateTime: z.string().optional().describe('End of date range in ISO 8601 format'),
      workspaceId: z.string().optional().describe('Filter by workspace ID'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      callTranscripts: z.array(callTranscriptSchema).describe('Transcripts for each call'),
      totalRecords: z.number().optional().describe('Total number of records'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.getCallTranscripts({
      filter: {
        callIds: ctx.input.callIds,
        fromDateTime: ctx.input.fromDateTime,
        toDateTime: ctx.input.toDateTime,
        workspaceId: ctx.input.workspaceId
      },
      cursor: ctx.input.cursor
    });

    let callTranscripts = (result.callTranscripts || []).map((ct: any) => ({
      callId: ct.callId,
      transcript: (ct.transcript || []).map((entry: any) => ({
        speakerId: entry.speakerId,
        topic: entry.topic,
        sentences: entry.sentences?.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text
        }))
      }))
    }));

    return {
      output: {
        callTranscripts,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved transcripts for ${callTranscripts.length} call(s).`
    };
  })
  .build();
