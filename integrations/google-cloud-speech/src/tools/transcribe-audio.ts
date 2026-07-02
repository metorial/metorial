import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe audio to text using Google Cloud Speech-to-Text (synchronous recognition). Supports inline base64-encoded audio or audio files in Google Cloud Storage. Use for audio files up to 1 minute in duration.

Configure language, model, punctuation, word-level details, speaker diarization, and speech adaptation hints.`,
  instructions: [
    'Provide audio either as base64-encoded content or a Google Cloud Storage URI (gs://bucket/file).',
    'Use a recognizer ID to leverage a pre-configured recognizer, or specify model and language directly.'
  ],
  constraints: [
    'Synchronous recognition is limited to audio of 1 minute or less and 10 MB max.',
    'For longer audio, use the Batch Transcribe Audio tool instead.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.transcribeAudio)
  .input(
    z.object({
      audioContent: z
        .string()
        .optional()
        .describe('Base64-encoded audio data. Provide this OR audioUri, not both.'),
      audioUri: z
        .string()
        .optional()
        .describe(
          'Google Cloud Storage URI of the audio file (e.g. gs://bucket/file.wav). Provide this OR audioContent, not both.'
        ),
      recognizerId: z
        .string()
        .optional()
        .describe(
          'ID of a pre-configured recognizer. If omitted, uses the default recognizer with inline config.'
        ),
      model: z
        .string()
        .optional()
        .describe(
          'Recognition model to use (e.g. "latest_long", "latest_short", "telephony", "chirp", "chirp_2"). Defaults to the recognizer\'s model if a recognizer is specified.'
        ),
      languageCodes: z
        .array(z.string())
        .optional()
        .describe(
          'BCP-47 language codes (e.g. ["en-US", "es-ES"]). First code is primary language.'
        ),
      enableAutomaticPunctuation: z
        .boolean()
        .optional()
        .describe('Enable automatic punctuation in transcription results.'),
      enableWordTimeOffsets: z
        .boolean()
        .optional()
        .describe('Include start and end time offsets for each word.'),
      enableWordConfidence: z
        .boolean()
        .optional()
        .describe('Include confidence scores for each word.'),
      enableSpokenPunctuation: z
        .boolean()
        .optional()
        .describe('Recognize spoken punctuation (e.g. "period" becomes ".").'),
      minSpeakerCount: z
        .number()
        .optional()
        .describe('Minimum number of speakers for diarization.'),
      maxSpeakerCount: z
        .number()
        .optional()
        .describe('Maximum number of speakers for diarization.'),
      speechContextPhrases: z
        .array(z.string())
        .optional()
        .describe('Phrases to bias recognition towards (speech adaptation hints).'),
      phraseBoost: z
        .number()
        .optional()
        .describe(
          'Boost value for speech context phrases (0-20). Higher values increase bias.'
        ),
      encoding: z
        .string()
        .optional()
        .describe(
          'Audio encoding format (e.g. "LINEAR16", "FLAC", "MULAW", "OGG_OPUS", "MP3"). Omit for auto-detection.'
        ),
      sampleRateHertz: z
        .number()
        .optional()
        .describe('Sample rate in Hertz. Required if encoding is specified.'),
      audioChannelCount: z
        .number()
        .optional()
        .describe('Number of audio channels. Defaults to 1.')
    })
  )
  .output(
    z.object({
      transcript: z.string().describe('Full concatenated transcript text.'),
      results: z
        .array(
          z.object({
            transcript: z.string().optional().describe('Transcript for this segment.'),
            confidence: z.number().optional().describe('Confidence score (0.0 to 1.0).'),
            words: z
              .array(
                z.object({
                  word: z.string().optional().describe('The transcribed word.'),
                  startOffset: z
                    .string()
                    .optional()
                    .describe('Start time offset of the word.'),
                  endOffset: z.string().optional().describe('End time offset of the word.'),
                  confidence: z.number().optional().describe('Word-level confidence score.'),
                  speakerLabel: z
                    .string()
                    .optional()
                    .describe('Speaker label from diarization.')
                })
              )
              .optional()
              .describe('Word-level details, if requested.'),
            channelTag: z
              .number()
              .optional()
              .describe('Channel number for multi-channel audio.'),
            languageCode: z.string().optional().describe('Detected language code.')
          })
        )
        .describe('Individual recognition results.'),
      totalBilledDuration: z.string().optional().describe('Total audio duration billed.'),
      requestId: z.string().optional().describe('Unique request identifier.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    ctx.info('Sending audio for transcription...');

    let response = await client.recognize({
      audioContent: ctx.input.audioContent,
      audioUri: ctx.input.audioUri,
      recognizerId: ctx.input.recognizerId,
      model: ctx.input.model,
      languageCodes: ctx.input.languageCodes,
      enableAutomaticPunctuation: ctx.input.enableAutomaticPunctuation,
      enableWordTimeOffsets: ctx.input.enableWordTimeOffsets,
      enableWordConfidence: ctx.input.enableWordConfidence,
      enableSpokenPunctuation: ctx.input.enableSpokenPunctuation,
      minSpeakerCount: ctx.input.minSpeakerCount,
      maxSpeakerCount: ctx.input.maxSpeakerCount,
      speechContextPhrases: ctx.input.speechContextPhrases,
      phraseBoost: ctx.input.phraseBoost,
      encoding: ctx.input.encoding,
      sampleRateHertz: ctx.input.sampleRateHertz,
      audioChannelCount: ctx.input.audioChannelCount
    });

    let results = (response.results || []).map(r => ({
      transcript: r.alternatives?.[0]?.transcript,
      confidence: r.alternatives?.[0]?.confidence,
      words: r.alternatives?.[0]?.words?.map(w => ({
        word: w.word,
        startOffset: w.startOffset,
        endOffset: w.endOffset,
        confidence: w.confidence,
        speakerLabel: w.speakerLabel
      })),
      channelTag: r.channelTag,
      languageCode: r.languageCode
    }));

    let fullTranscript = results
      .map(r => r.transcript || '')
      .join(' ')
      .trim();

    return {
      output: {
        transcript: fullTranscript,
        results,
        totalBilledDuration: response.metadata?.totalBilledDuration,
        requestId: response.metadata?.requestId
      },
      message: fullTranscript
        ? `Transcription completed: "${fullTranscript.substring(0, 200)}${fullTranscript.length > 200 ? '...' : ''}"`
        : 'Transcription completed but no speech was detected.'
    };
  })
  .build();
