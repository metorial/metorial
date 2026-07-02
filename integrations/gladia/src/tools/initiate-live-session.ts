import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let initiateLiveSession = SlateTool.create(spec, {
  name: 'Initiate Live Session',
  key: 'initiate_live_session',
  description: `Create a new real-time transcription session. Returns a WebSocket URL to stream audio chunks for live speech-to-text. Supports configurable encoding, sample rate, language detection, and real-time audio intelligence features like translation and sentiment analysis.`,
  instructions: [
    'Configure the audio encoding settings to match your audio source.',
    'Connect to the returned WebSocket URL to start streaming audio.',
    'Send raw audio chunks or base64-encoded audio to the WebSocket.',
    'Send {"type": "stop_recording"} to end the session and trigger post-processing.'
  ],
  constraints: [
    'WebSocket URL includes a temporary token and expires if not used.',
    'Audio encoding, sample rate, bit depth, and channels must match the audio being streamed.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      encoding: z
        .enum(['wav/pcm', 'wav/alaw', 'wav/ulaw'])
        .optional()
        .describe('Audio encoding format (default: wav/pcm)'),
      sampleRate: z
        .number()
        .optional()
        .describe(
          'Audio sample rate in Hz (8000, 16000, 32000, 44100, or 48000; default: 16000)'
        ),
      bitDepth: z
        .number()
        .optional()
        .describe('Audio bit depth (8, 16, 24, or 32; default: 16)'),
      channels: z.number().optional().describe('Number of audio channels (1-8; default: 1)'),
      endpointing: z
        .number()
        .optional()
        .describe(
          'Silence duration in seconds to trigger utterance finalization (0.01-10; default: 0.05)'
        ),
      maximumDurationWithoutEndpointing: z
        .number()
        .optional()
        .describe(
          'Maximum utterance duration in seconds before forced finalization (default: 5)'
        ),
      region: z.string().optional().describe('Processing region (e.g., "eu-west", "us-west")'),

      languages: z
        .array(z.string())
        .optional()
        .describe('ISO 639 language codes. Leave empty for auto-detection.'),
      codeSwitching: z
        .boolean()
        .optional()
        .describe('Enable automatic language switching detection'),

      audioEnhancer: z
        .boolean()
        .optional()
        .describe('Enable audio quality enhancement (increases latency)'),
      speechThreshold: z
        .number()
        .optional()
        .describe('Speech detection sensitivity (0-1; default: 0.6)'),

      realtimeTranslation: z.boolean().optional().describe('Enable real-time translation'),
      realtimeTranslationTargetLanguages: z
        .array(z.string())
        .optional()
        .describe('Target language codes for real-time translation'),
      realtimeTranslationModel: z
        .enum(['base', 'enhanced'])
        .optional()
        .describe('Translation model quality'),
      realtimeNer: z
        .boolean()
        .optional()
        .describe('Enable real-time named entity recognition'),
      realtimeSentiment: z
        .boolean()
        .optional()
        .describe('Enable real-time sentiment analysis'),

      postSummarization: z.boolean().optional().describe('Enable post-session summarization'),
      postSummarizationType: z
        .enum(['general', 'concise', 'bullet_points'])
        .optional()
        .describe('Summarization type for post-processing'),
      postChapterization: z
        .boolean()
        .optional()
        .describe('Enable post-session chapterization'),

      receivePartialTranscripts: z
        .boolean()
        .optional()
        .describe('Receive interim (partial) transcript results (default: true)'),

      callbackUrl: z.string().optional().describe('URL to receive post-processing results'),
      callbackMethod: z
        .enum(['POST', 'PUT'])
        .optional()
        .describe('HTTP method for callback (default: POST)'),

      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arbitrary key-value metadata to attach to the session')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique ID of the live session'),
      websocketUrl: z.string().describe('WebSocket URL to connect to for streaming audio'),
      createdAt: z.string().describe('ISO 8601 timestamp when the session was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: any = {};

    if (ctx.input.encoding) params.encoding = ctx.input.encoding;
    if (ctx.input.sampleRate) params.sample_rate = ctx.input.sampleRate;
    if (ctx.input.bitDepth) params.bit_depth = ctx.input.bitDepth;
    if (ctx.input.channels) params.channels = ctx.input.channels;
    if (ctx.input.endpointing !== undefined) params.endpointing = ctx.input.endpointing;
    if (ctx.input.maximumDurationWithoutEndpointing !== undefined)
      params.maximum_duration_without_endpointing =
        ctx.input.maximumDurationWithoutEndpointing;
    if (ctx.input.region) params.region = ctx.input.region;

    if (ctx.input.languages || ctx.input.codeSwitching) {
      params.language_config = {
        languages: ctx.input.languages,
        code_switching: ctx.input.codeSwitching
      };
    }

    if (ctx.input.audioEnhancer !== undefined || ctx.input.speechThreshold !== undefined) {
      params.pre_processing = {
        audio_enhancer: ctx.input.audioEnhancer,
        speech_threshold: ctx.input.speechThreshold
      };
    }

    let hasRealtimeProcessing =
      ctx.input.realtimeTranslation || ctx.input.realtimeNer || ctx.input.realtimeSentiment;
    if (hasRealtimeProcessing) {
      params.realtime_processing = {};
      if (ctx.input.realtimeTranslation) {
        params.realtime_processing.translation = true;
        if (
          ctx.input.realtimeTranslationTargetLanguages ||
          ctx.input.realtimeTranslationModel
        ) {
          params.realtime_processing.translation_config = {
            target_languages: ctx.input.realtimeTranslationTargetLanguages,
            model: ctx.input.realtimeTranslationModel
          };
        }
      }
      if (ctx.input.realtimeNer) params.realtime_processing.named_entity_recognition = true;
      if (ctx.input.realtimeSentiment) params.realtime_processing.sentiment_analysis = true;
    }

    let hasPostProcessing = ctx.input.postSummarization || ctx.input.postChapterization;
    if (hasPostProcessing) {
      params.post_processing = {};
      if (ctx.input.postSummarization) {
        params.post_processing.summarization = true;
        if (ctx.input.postSummarizationType) {
          params.post_processing.summarization_config = {
            type: ctx.input.postSummarizationType
          };
        }
      }
      if (ctx.input.postChapterization) params.post_processing.chapterization = true;
    }

    if (ctx.input.receivePartialTranscripts !== undefined) {
      params.messages_config = {
        receive_partial_transcripts: ctx.input.receivePartialTranscripts
      };
    }

    if (ctx.input.callbackUrl) {
      params.callback_config = {
        url: ctx.input.callbackUrl,
        method: ctx.input.callbackMethod
      };
    }

    if (ctx.input.customMetadata) {
      params.custom_metadata = ctx.input.customMetadata;
    }

    ctx.info('Initiating live session...');
    let result = await client.initiateLiveSession(params);

    return {
      output: {
        sessionId: result.id,
        websocketUrl: result.url,
        createdAt: result.created_at
      },
      message: `Live transcription session **created**. Session ID: \`${result.id}\`. Connect to the WebSocket URL to start streaming audio.`
    };
  })
  .build();
