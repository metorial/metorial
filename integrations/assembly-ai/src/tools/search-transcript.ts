import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTranscript = SlateTool.create(spec, {
  name: 'Search Transcript',
  key: 'search_transcript',
  description: `Search through a completed transcript for specific keywords. You can search for individual words, numbers, or phrases of up to five words.
Returns match counts and timestamps for each keyword found.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique transcript ID.'),
      words: z
        .array(z.string())
        .describe('Keywords or phrases to search for (each up to 5 words).')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('The transcript ID.'),
      totalCount: z.number().describe('Total number of matches across all keywords.'),
      matches: z.array(
        z.object({
          text: z.string().describe('The matched word or phrase.'),
          count: z.number().describe('Number of occurrences.'),
          timestamps: z
            .array(
              z.object({
                start: z.number().describe('Start time in milliseconds.'),
                end: z.number().describe('End time in milliseconds.')
              })
            )
            .describe('Timestamps for each occurrence.'),
          indexes: z
            .array(z.number())
            .describe('Position indexes in the transcript words array.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.wordSearch(ctx.input.transcriptId, ctx.input.words);

    let matches = (result.matches || []).map((m: any) => ({
      text: m.text,
      count: m.count,
      timestamps: (m.timestamps || []).map((t: any) => ({
        start: t.start,
        end: t.end
      })),
      indexes: m.indexes || []
    }));

    return {
      output: {
        transcriptId: result.id,
        totalCount: result.total_count,
        matches
      },
      message: `Found **${result.total_count}** total match(es) for ${ctx.input.words.length} keyword(s) in transcript **${result.id}**.`
    };
  })
  .build();
