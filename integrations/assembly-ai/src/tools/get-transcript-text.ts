import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let segmentSchema = z.object({
  text: z.string().describe('The segment text.'),
  start: z.number().describe('Start time in milliseconds.'),
  end: z.number().describe('End time in milliseconds.'),
  confidence: z.number().describe('Confidence score.'),
  speaker: z.string().optional().nullable().describe('Speaker label if available.'),
  words: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number(),
        speaker: z.string().optional().nullable()
      })
    )
    .optional()
    .describe('Words in this segment.')
});

export let getTranscriptText = SlateTool.create(spec, {
  name: 'Get Transcript Text',
  key: 'get_transcript_text',
  description: `Retrieve a completed transcript's text segmented into sentences or paragraphs. The API semantically segments the text for more reader-friendly output.
Choose "sentences" or "paragraphs" segmentation depending on how granular you need the output.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique transcript ID.'),
      segmentation: z
        .enum(['sentences', 'paragraphs'])
        .describe(
          'How to segment the text: "sentences" for fine-grained, "paragraphs" for broader chunks.'
        )
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('The transcript ID.'),
      confidence: z.number().describe('Overall confidence score.'),
      audioDuration: z.number().describe('Audio duration in seconds.'),
      segments: z
        .array(segmentSchema)
        .describe('The transcript segments (sentences or paragraphs).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result =
      ctx.input.segmentation === 'sentences'
        ? await client.getSentences(ctx.input.transcriptId)
        : await client.getParagraphs(ctx.input.transcriptId);

    let segmentKey = ctx.input.segmentation === 'sentences' ? 'sentences' : 'paragraphs';
    let segments = (result[segmentKey] || []).map((s: any) => ({
      text: s.text,
      start: s.start,
      end: s.end,
      confidence: s.confidence,
      speaker: s.speaker ?? null,
      words: s.words
    }));

    return {
      output: {
        transcriptId: result.id,
        confidence: result.confidence,
        audioDuration: result.audio_duration,
        segments
      },
      message: `Retrieved **${segments.length}** ${ctx.input.segmentation} from transcript **${result.id}**.`
    };
  })
  .build();
