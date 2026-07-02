import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitTranscription = SlateTool.create(spec, {
  name: 'Submit Transcription',
  key: 'submit_transcription',
  description: `Submit an audio or video file for asynchronous transcription. Provide a publicly accessible URL to the media file.
Optionally enable audio intelligence features like summarization, sentiment analysis, entity detection, topic detection, content moderation, key phrases, auto chapters, and PII redaction.
Returns the transcript object with a status of "queued" — poll using the **Get Transcript** tool to check for completion.`,
  instructions: [
    'The audio URL must be a direct link to a media file (not a webpage).',
    'To enable summarization, set both summarization=true and provide summaryType and optionally summaryModel.',
    'PII redaction requires redactPii=true and at least one policy in redactPiiPolicies.'
  ],
  constraints: [
    'Transcription is asynchronous. The response will have status "queued" or "processing".',
    'Maximum audio duration depends on your plan. Files are processed in the order they are submitted.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      audioUrl: z.string().describe('Direct URL to the audio or video file to transcribe.'),
      languageCode: z
        .string()
        .optional()
        .describe('Language code (e.g., "en_us", "es", "fr"). Defaults to "en_us".'),
      languageDetection: z
        .boolean()
        .optional()
        .describe('Enable automatic language detection.'),
      languageConfidenceThreshold: z
        .number()
        .optional()
        .describe('Minimum confidence (0-1) for auto-detected language.'),
      speechModel: z
        .string()
        .optional()
        .describe('Speech model to use (e.g., "universal", "slam-1").'),
      punctuate: z
        .boolean()
        .optional()
        .describe('Enable automatic punctuation. Defaults to true.'),
      formatText: z.boolean().optional().describe('Enable text formatting. Defaults to true.'),
      disfluencies: z
        .boolean()
        .optional()
        .describe('Include filler words (umm, uh) in transcript.'),
      filterProfanity: z
        .boolean()
        .optional()
        .describe('Filter profanity from the transcript.'),
      speakerLabels: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization to identify different speakers.'),
      speakersExpected: z
        .number()
        .optional()
        .describe('Expected number of speakers (helps improve diarization accuracy).'),
      multichannel: z
        .boolean()
        .optional()
        .describe('Transcribe each audio channel separately.'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a webhook when transcription completes or fails.'),
      webhookAuthHeaderName: z
        .string()
        .optional()
        .describe('Custom header name for webhook authentication.'),
      webhookAuthHeaderValue: z
        .string()
        .optional()
        .describe('Custom header value for webhook authentication.'),
      autoHighlights: z.boolean().optional().describe('Enable key phrase extraction.'),
      autoChapters: z.boolean().optional().describe('Enable automatic chapter generation.'),
      entityDetection: z
        .boolean()
        .optional()
        .describe('Enable entity detection (names, locations, organizations, etc.).'),
      sentimentAnalysis: z
        .boolean()
        .optional()
        .describe('Enable sentiment analysis on transcript segments.'),
      contentSafety: z
        .boolean()
        .optional()
        .describe('Enable content moderation to detect sensitive content.'),
      contentSafetyConfidence: z
        .number()
        .optional()
        .describe('Minimum confidence (25-100) for content moderation.'),
      iabCategories: z
        .boolean()
        .optional()
        .describe('Enable topic detection using IAB taxonomy.'),
      summarization: z.boolean().optional().describe('Enable transcript summarization.'),
      summaryModel: z
        .enum(['informative', 'conversational', 'catchy'])
        .optional()
        .describe('Summarization model to use.'),
      summaryType: z
        .enum(['bullets', 'bullets_verbose', 'gist', 'headline', 'paragraph'])
        .optional()
        .describe('Summary output format.'),
      redactPii: z
        .boolean()
        .optional()
        .describe('Enable PII redaction in the transcript text.'),
      redactPiiAudio: z
        .boolean()
        .optional()
        .describe('Generate a redacted audio copy with PII beeped out.'),
      redactPiiAudioQuality: z
        .enum(['mp3', 'wav'])
        .optional()
        .describe('Format for redacted audio.'),
      redactPiiPolicies: z
        .array(z.string())
        .optional()
        .describe(
          'List of PII types to redact (e.g., "person_name", "email_address", "phone_number", "credit_card_number", "ssn").'
        ),
      redactPiiSub: z
        .enum(['entity_name', 'hash'])
        .optional()
        .describe('How to replace PII in text: "entity_name" or "hash".'),
      audioStartFrom: z
        .number()
        .optional()
        .describe('Start transcription from this millisecond position.'),
      audioEndAt: z
        .number()
        .optional()
        .describe('Stop transcription at this millisecond position.'),
      speechThreshold: z
        .number()
        .optional()
        .describe('Reject audio with less than this fraction of speech (0-1).'),
      prompt: z
        .string()
        .optional()
        .describe(
          'Natural language context (up to 1500 words) to guide transcription. Only supported for Universal-3-Pro.'
        )
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Unique identifier for the transcript.'),
      status: z.string().describe('Current status: queued, processing, completed, or error.'),
      audioUrl: z.string().describe('The audio URL submitted for transcription.'),
      languageCode: z
        .string()
        .optional()
        .nullable()
        .describe('Language code used or detected.'),
      webhookUrl: z.string().optional().nullable().describe('Webhook URL if configured.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.submitTranscription(ctx.input);

    return {
      output: {
        transcriptId: result.id,
        status: result.status,
        audioUrl: result.audio_url,
        languageCode: result.language_code,
        webhookUrl: result.webhook_url
      },
      message: `Transcription submitted successfully. Transcript ID: **${result.id}**, Status: **${result.status}**. Poll using the Get Transcript tool to check for completion.`
    };
  })
  .build();
