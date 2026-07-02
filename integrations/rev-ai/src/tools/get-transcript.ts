import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieves the transcript for a completed transcription job. Supports plain text and JSON output formats. Can also fetch translated transcripts and summaries if they were requested during job submission.`,
  instructions: [
    'The job must have status "transcribed" before fetching the transcript.',
    'Use format "text" for plain text or "json" for structured JSON with timestamps and speaker labels.',
    'Set translationLanguage to retrieve a translated version (must have been requested at job submission).',
    'Set includeSummary to true to also fetch the transcript summary (must have been requested at job submission).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the completed transcription job'),
      format: z
        .enum(['text', 'json'])
        .optional()
        .describe(
          'Output format: "text" for plain text, "json" for structured JSON with timestamps (default: "text")'
        ),
      translationLanguage: z
        .string()
        .optional()
        .describe(
          'Language code to retrieve translated transcript (must have been enabled during job submission)'
        ),
      includeSummary: z
        .boolean()
        .optional()
        .describe(
          'Also fetch the transcript summary (must have been enabled during job submission)'
        )
    })
  )
  .output(
    z.object({
      transcript: z
        .string()
        .optional()
        .describe('Plain text transcript (when format is "text")'),
      monologues: z
        .array(
          z.object({
            speaker: z.number().describe('Speaker identifier'),
            elements: z
              .array(
                z.object({
                  type: z.string().describe('Element type: "text", "punct", or "unknown"'),
                  value: z.string().describe('The text content'),
                  ts: z.number().optional().describe('Start timestamp in seconds'),
                  endTs: z.number().optional().describe('End timestamp in seconds'),
                  confidence: z.number().optional().describe('Confidence score for the word')
                })
              )
              .describe('Transcript elements for this speaker segment')
          })
        )
        .optional()
        .describe(
          'Structured transcript with speaker labels and timestamps (when format is "json")'
        ),
      translatedTranscript: z.string().optional().describe('Translated transcript text'),
      summary: z.string().optional().describe('Transcript summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });
    let format = ctx.input.format || 'text';

    let transcript: string | undefined;
    let monologues:
      | Array<{
          speaker: number;
          elements: Array<{
            type: string;
            value: string;
            ts?: number;
            endTs?: number;
            confidence?: number;
          }>;
        }>
      | undefined;

    if (format === 'json') {
      let result = await client.getTranscriptJson(ctx.input.jobId);
      monologues = result.monologues;
    } else {
      transcript = await client.getTranscriptText(ctx.input.jobId);
    }

    let translatedTranscript: string | undefined;
    if (ctx.input.translationLanguage) {
      translatedTranscript = await client.getTranslatedTranscriptText(
        ctx.input.jobId,
        ctx.input.translationLanguage
      );
    }

    let summary: string | undefined;
    if (ctx.input.includeSummary) {
      summary = await client.getTranscriptSummary(ctx.input.jobId);
    }

    let snippetText =
      transcript ||
      (monologues
        ? monologues.map(m => m.elements.map(e => e.value).join('')).join('\n')
        : '');
    let snippet =
      snippetText.length > 200 ? `${snippetText.substring(0, 200)}...` : snippetText;

    return {
      output: {
        transcript,
        monologues,
        translatedTranscript,
        summary
      },
      message: `Transcript retrieved for job **${ctx.input.jobId}** in **${format}** format.${translatedTranscript ? ' Translation included.' : ''}${summary ? ' Summary included.' : ''}\n\n> ${snippet}`
    };
  })
  .build();
