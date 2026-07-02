import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wordSchema = z.object({
  text: z.string().describe('The transcribed word'),
  startTime: z.number().describe('Start time in seconds'),
  endTime: z.number().describe('End time in seconds')
});

let transcriptEntrySchema = z.object({
  entryId: z.number().describe('Transcript entry ID'),
  speaker: z.string().describe('Speaker name'),
  speakerId: z.number().nullable().describe('Speaker participant ID'),
  words: z.array(wordSchema).describe('Words in this transcript segment'),
  language: z.string().nullable().describe('Detected language')
});

export let getTranscriptTool = SlateTool.create(spec, {
  name: 'Get Bot Transcript',
  key: 'get_transcript',
  description: `Retrieve the transcript produced by a bot. Returns the full transcript with speaker attribution, timestamps, and individual words. If the call is still in progress, returns the transcript so far.`,
  constraints: [
    'Rate limit: 300 requests per minute per workspace.',
    "Transcription must be enabled in the bot's recording config to produce a transcript."
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z
        .string()
        .describe('The unique identifier of the bot whose transcript to retrieve')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot ID the transcript belongs to'),
      entries: z
        .array(transcriptEntrySchema)
        .describe('Transcript entries with speaker attribution and timing'),
      totalEntries: z.number().describe('Total number of transcript entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let entries = await client.getBotTranscript(ctx.input.botId);

    return {
      output: {
        botId: ctx.input.botId,
        entries: entries.map(e => ({
          entryId: e.id,
          speaker: e.speaker,
          speakerId: e.speakerId,
          words: e.words,
          language: e.language
        })),
        totalEntries: entries.length
      },
      message: `Retrieved **${entries.length}** transcript entries for bot ${ctx.input.botId}.`
    };
  })
  .build();
