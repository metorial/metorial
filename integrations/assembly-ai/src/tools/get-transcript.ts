import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wordSchema = z.object({
  text: z.string().describe('The word text.'),
  start: z.number().describe('Start time in milliseconds.'),
  end: z.number().describe('End time in milliseconds.'),
  confidence: z.number().describe('Confidence score for this word.'),
  speaker: z
    .string()
    .optional()
    .nullable()
    .describe('Speaker label if diarization is enabled.')
});

let utteranceSchema = z.object({
  text: z.string().describe('The utterance text.'),
  start: z.number().describe('Start time in milliseconds.'),
  end: z.number().describe('End time in milliseconds.'),
  confidence: z.number().describe('Confidence score.'),
  speaker: z.string().describe('Speaker label.'),
  words: z.array(wordSchema).optional().describe('Words in this utterance.')
});

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieve a transcript by its ID. Returns the full transcript object including text, words with timestamps, speaker labels, and any enabled audio intelligence results (summary, sentiment, entities, topics, chapters, content safety, key phrases).
Use this to poll for completion after submitting a transcription, or to retrieve results of a completed transcript.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique transcript ID.')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Unique identifier for the transcript.'),
      status: z.string().describe('Current status: queued, processing, completed, or error.'),
      error: z.string().optional().nullable().describe('Error message if status is "error".'),
      audioUrl: z.string().describe('The audio URL that was transcribed.'),
      audioDuration: z.number().optional().nullable().describe('Audio duration in seconds.'),
      text: z.string().optional().nullable().describe('Full transcript text.'),
      confidence: z.number().optional().nullable().describe('Overall confidence score (0-1).'),
      languageCode: z
        .string()
        .optional()
        .nullable()
        .describe('Detected or specified language code.'),
      languageConfidence: z
        .number()
        .optional()
        .nullable()
        .describe('Language detection confidence (0-1).'),
      words: z
        .array(wordSchema)
        .optional()
        .nullable()
        .describe('Array of words with timestamps and confidence.'),
      utterances: z
        .array(utteranceSchema)
        .optional()
        .nullable()
        .describe('Turn-by-turn utterances with speaker labels.'),
      summary: z
        .string()
        .optional()
        .nullable()
        .describe('Transcript summary if summarization was enabled.'),
      sentimentAnalysisResults: z
        .array(
          z.object({
            text: z.string(),
            sentiment: z.string().describe('POSITIVE, NEGATIVE, or NEUTRAL.'),
            confidence: z.number(),
            start: z.number(),
            end: z.number(),
            speaker: z.string().optional().nullable()
          })
        )
        .optional()
        .nullable()
        .describe('Sentiment analysis results per segment.'),
      entities: z
        .array(
          z.object({
            entityType: z.string().describe('Type of entity detected.'),
            text: z.string().describe('Entity text.'),
            start: z.number().describe('Start time in milliseconds.'),
            end: z.number().describe('End time in milliseconds.')
          })
        )
        .optional()
        .nullable()
        .describe('Detected entities.'),
      chapters: z
        .array(
          z.object({
            gist: z.string(),
            headline: z.string(),
            summary: z.string(),
            start: z.number(),
            end: z.number()
          })
        )
        .optional()
        .nullable()
        .describe('Auto-generated chapters.'),
      autoHighlightsResult: z
        .object({
          results: z.array(
            z.object({
              text: z.string(),
              count: z.number(),
              rank: z.number(),
              timestamps: z.array(z.object({ start: z.number(), end: z.number() }))
            })
          )
        })
        .optional()
        .nullable()
        .describe('Key phrase extraction results.'),
      contentSafetyLabels: z
        .any()
        .optional()
        .nullable()
        .describe('Content moderation results.'),
      iabCategoriesResult: z
        .any()
        .optional()
        .nullable()
        .describe('Topic detection results using IAB taxonomy.'),
      speechModelUsed: z
        .string()
        .optional()
        .nullable()
        .describe('The speech model that was used.'),
      throttled: z
        .boolean()
        .optional()
        .nullable()
        .describe('Whether the transcript was throttled.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getTranscript(ctx.input.transcriptId);

    let output: any = {
      transcriptId: result.id,
      status: result.status,
      error: result.error ?? null,
      audioUrl: result.audio_url,
      audioDuration: result.audio_duration ?? null,
      text: result.text ?? null,
      confidence: result.confidence ?? null,
      languageCode: result.language_code ?? null,
      languageConfidence: result.language_confidence ?? null,
      words: result.words ?? null,
      utterances: result.utterances ?? null,
      summary: result.summary ?? null,
      speechModelUsed: result.speech_model_used ?? null,
      throttled: result.throttled ?? null
    };

    if (result.sentiment_analysis_results) {
      output.sentimentAnalysisResults = result.sentiment_analysis_results;
    }

    if (result.entities) {
      output.entities = result.entities.map((e: any) => ({
        entityType: e.entity_type,
        text: e.text,
        start: e.start,
        end: e.end
      }));
    }

    if (result.chapters) {
      output.chapters = result.chapters;
    }

    if (result.auto_highlights_result) {
      output.autoHighlightsResult = result.auto_highlights_result;
    }

    if (result.content_safety_labels) {
      output.contentSafetyLabels = result.content_safety_labels;
    }

    if (result.iab_categories_result) {
      output.iabCategoriesResult = result.iab_categories_result;
    }

    let statusMsg =
      result.status === 'completed'
        ? `Transcript **${result.id}** is **completed**. Duration: ${result.audio_duration ?? 'N/A'}s, Confidence: ${result.confidence ?? 'N/A'}.`
        : result.status === 'error'
          ? `Transcript **${result.id}** has **failed**: ${result.error}`
          : `Transcript **${result.id}** is **${result.status}**. Check back later.`;

    return {
      output,
      message: statusMsg
    };
  })
  .build();
