import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { deepgramServiceError } from '../lib/errors';
import { spec } from '../spec';

let customModeSchema = z
  .enum(['strict', 'extended'])
  .describe('How Deepgram should match custom topics or intents.');

let transcriptionOptionsSchema = z.object({
  model: z
    .string()
    .optional()
    .describe(
      'Model to use for transcription (for example, "nova-3", "nova-2", or "whisper-large"). Defaults to the latest general model.'
    ),
  version: z
    .string()
    .optional()
    .describe('Specific model version to use, or "latest" for the latest model version.'),
  language: z
    .string()
    .optional()
    .describe(
      'BCP-47 language code (for example, "en", "es", or "fr"). Leave unset when using detectLanguage.'
    ),
  detectLanguage: z.boolean().optional().describe('Enable automatic language detection.'),
  detectEntities: z
    .boolean()
    .optional()
    .describe('Extract named entities from submitted audio when supported.'),
  punctuate: z.boolean().optional().describe('Add punctuation to the transcript.'),
  smartFormat: z
    .boolean()
    .optional()
    .describe('Enable smart formatting for currencies, phone numbers, emails, etc.'),
  diarize: z
    .boolean()
    .optional()
    .describe('Deprecated Deepgram diarization flag. Prefer diarizeModel.'),
  diarizeModel: z
    .enum(['latest', 'v1', 'v2'])
    .optional()
    .describe('Enable diarization with a specific Deepgram diarization model version.'),
  utterances: z
    .boolean()
    .optional()
    .describe('Segment transcript into utterances, typically speaker turns.'),
  dictation: z
    .boolean()
    .optional()
    .describe('Enable dictated formatting commands when supported by the selected model.'),
  encoding: z
    .string()
    .optional()
    .describe(
      'Expected input audio encoding, for example "linear16", "flac", "mulaw", or "opus".'
    ),
  fillerWords: z
    .boolean()
    .optional()
    .describe('Include filler words such as "uh" and "um" when supported.'),
  measurements: z
    .boolean()
    .optional()
    .describe('Convert spoken measurements to abbreviations when supported.'),
  multichannel: z
    .boolean()
    .optional()
    .describe('Transcribe each audio channel independently.'),
  numerals: z
    .boolean()
    .optional()
    .describe('Convert written numbers to numerical format when supported.'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Keywords to boost recognition for supported models.'),
  keyterms: z
    .array(z.string())
    .optional()
    .describe('Key term prompting values for Nova-3; sent as Deepgram keyterm parameters.'),
  search: z.array(z.string()).optional().describe('Terms to search for in the transcript.'),
  replace: z
    .array(z.string())
    .optional()
    .describe('Search/replace terms to apply using Deepgram replace query values.'),
  summarize: z.boolean().optional().describe('Generate a summary of the transcript.'),
  topics: z.boolean().optional().describe('Detect topics discussed in the audio.'),
  intents: z.boolean().optional().describe('Detect intents in the audio.'),
  sentiment: z.boolean().optional().describe('Analyze sentiment of the transcript.'),
  paragraphs: z.boolean().optional().describe('Split transcript into paragraphs.'),
  redact: z
    .array(z.string())
    .optional()
    .describe('Types of information to redact, such as "pci", "ssn", or "numbers".'),
  customTopics: z
    .array(z.string())
    .optional()
    .describe('Custom topics to look for when topics is enabled.'),
  customTopicMode: customModeSchema.optional(),
  customIntents: z
    .array(z.string())
    .optional()
    .describe('Custom intents to look for when intents is enabled.'),
  customIntentMode: customModeSchema.optional(),
  profanityFilter: z.boolean().optional().describe('Replace profanity in transcripts.'),
  uttSplit: z
    .number()
    .optional()
    .describe('Seconds of silence before Deepgram splits utterances.'),
  mipOptOut: z.boolean().optional().describe('Opt out of model improvement processing.'),
  tag: z.string().optional().describe('Tag for tracking the request in usage reports.'),
  callbackUrl: z
    .string()
    .optional()
    .describe('Optional callback URL for asynchronous transcription results.'),
  callbackMethod: z
    .enum(['POST', 'PUT'])
    .optional()
    .describe('HTTP method Deepgram should use for callback delivery.')
});

let wordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  speaker: z.number().optional(),
  punctuatedWord: z.string().optional()
});

let alternativeSchema = z.object({
  transcript: z.string(),
  confidence: z.number(),
  words: z.array(wordSchema).optional(),
  paragraphs: z.any().optional(),
  summaries: z.array(z.any()).optional(),
  topics: z.array(z.any()).optional(),
  intents: z.array(z.any()).optional(),
  sentiments: z.array(z.any()).optional()
});

let channelSchema = z.object({
  alternatives: z.array(alternativeSchema),
  detectedLanguage: z.string().optional()
});

let validateCustomOptions = (input: z.infer<typeof transcriptionOptionsSchema>) => {
  if ((input.customTopics?.length ?? 0) > 0 && !input.topics) {
    throw deepgramServiceError('customTopics requires topics=true.');
  }

  if (input.customTopicMode && (input.customTopics?.length ?? 0) === 0) {
    throw deepgramServiceError('customTopicMode requires at least one customTopics value.');
  }

  if ((input.customIntents?.length ?? 0) > 0 && !input.intents) {
    throw deepgramServiceError('customIntents requires intents=true.');
  }

  if (input.customIntentMode && (input.customIntents?.length ?? 0) === 0) {
    throw deepgramServiceError('customIntentMode requires at least one customIntents value.');
  }

  if (input.callbackMethod && !input.callbackUrl) {
    throw deepgramServiceError('callbackMethod requires callbackUrl.');
  }

  if (input.diarize && input.diarizeModel) {
    throw deepgramServiceError('Use either diarize or diarizeModel, not both.');
  }
};

export let transcribeAudioTool = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe pre-recorded audio to text from a URL or base64-encoded audio file. Supports model selection, language detection, diarization, smart formatting, keyword or keyterm prompting, callbacks, redaction, and Deepgram text intelligence features such as summarization, topic detection, intent detection, and sentiment analysis.`,
  instructions: [
    'Provide either audioUrl or audioData+mimetype, not both.',
    'Use callbackUrl for asynchronous transcription; callback requests return a requestId instead of transcript results.',
    'Enable diarize=true and utterances=true together for speaker-attributed transcripts.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioUrl: z
        .string()
        .optional()
        .describe('URL of the audio file to transcribe. Use this or audioData, not both.'),
      audioData: z
        .string()
        .optional()
        .describe('Base64-encoded audio data. Must also provide mimetype.'),
      mimetype: z
        .string()
        .optional()
        .describe(
          'MIME type of the audio data, for example "audio/wav" or "audio/mpeg". Required when using audioData.'
        ),
      ...transcriptionOptionsSchema.shape
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique request identifier.'),
      callbackSubmitted: z
        .boolean()
        .optional()
        .describe('True when Deepgram accepted an asynchronous callback request.'),
      transcript: z
        .string()
        .describe('Full transcript text from the primary channel/alternative.'),
      confidence: z
        .number()
        .optional()
        .describe('Overall confidence score of the transcript.'),
      words: z
        .array(wordSchema)
        .optional()
        .describe('Word-level details with timestamps and confidence.'),
      channels: z
        .array(channelSchema)
        .optional()
        .describe('Per-channel transcription results.'),
      detectedLanguage: z
        .string()
        .optional()
        .describe('Detected language if language detection was enabled.'),
      summary: z
        .any()
        .optional()
        .describe('Summary of the transcript if summarize was enabled.'),
      topics: z.any().optional().describe('Detected topics if topics was enabled.'),
      intents: z.any().optional().describe('Detected intents if intents was enabled.'),
      sentiments: z
        .any()
        .optional()
        .describe('Sentiment analysis results if sentiment was enabled.'),
      utterances: z
        .array(
          z.object({
            start: z.number(),
            end: z.number(),
            confidence: z.number(),
            channel: z.number(),
            transcript: z.string(),
            speaker: z.number().optional(),
            words: z.array(wordSchema).optional()
          })
        )
        .optional()
        .describe('Utterance segments if utterances was enabled.'),
      metadata: z
        .any()
        .optional()
        .describe('Request metadata including model info, duration, etc.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);

    let hasAudioUrl = Boolean(ctx.input.audioUrl);
    let hasAudioData = Boolean(ctx.input.audioData);

    if (hasAudioUrl === hasAudioData) {
      throw deepgramServiceError('Provide exactly one of audioUrl or audioData.');
    }

    if (hasAudioData && !ctx.input.mimetype) {
      throw deepgramServiceError('mimetype is required when providing audioData.');
    }

    validateCustomOptions(ctx.input);

    let commonParams = {
      model: ctx.input.model,
      version: ctx.input.version,
      language: ctx.input.language,
      detectLanguage: ctx.input.detectLanguage,
      detectEntities: ctx.input.detectEntities,
      punctuate: ctx.input.punctuate,
      smartFormat: ctx.input.smartFormat,
      diarize: ctx.input.diarize,
      diarizeModel: ctx.input.diarizeModel,
      utterances: ctx.input.utterances,
      dictation: ctx.input.dictation,
      encoding: ctx.input.encoding,
      fillerWords: ctx.input.fillerWords,
      measurements: ctx.input.measurements,
      multichannel: ctx.input.multichannel,
      numerals: ctx.input.numerals,
      keywords: ctx.input.keywords,
      keyterms: ctx.input.keyterms,
      search: ctx.input.search,
      replace: ctx.input.replace,
      summarize: ctx.input.summarize,
      topics: ctx.input.topics,
      intents: ctx.input.intents,
      sentiment: ctx.input.sentiment,
      paragraphs: ctx.input.paragraphs,
      redact: ctx.input.redact,
      customTopics: ctx.input.customTopics,
      customTopicMode: ctx.input.customTopicMode,
      customIntents: ctx.input.customIntents,
      customIntentMode: ctx.input.customIntentMode,
      profanityFilter: ctx.input.profanityFilter,
      uttSplit: ctx.input.uttSplit,
      mipOptOut: ctx.input.mipOptOut,
      tag: ctx.input.tag,
      callback: ctx.input.callbackUrl,
      callbackMethod: ctx.input.callbackMethod
    };

    let result: any = hasAudioUrl
      ? await client.transcribeUrl({
          url: ctx.input.audioUrl!,
          ...commonParams
        })
      : await client.transcribeAudio({
          audioData: ctx.input.audioData!,
          mimetype: ctx.input.mimetype!,
          ...commonParams
        });

    let requestId = result.metadata?.request_id || result.request_id;

    if (ctx.input.callbackUrl && !result.results) {
      return {
        output: {
          requestId,
          callbackSubmitted: true,
          transcript: '',
          metadata: result.metadata ?? result
        },
        message: `Submitted asynchronous Deepgram transcription request${requestId ? ` **${requestId}**` : ''}.`
      };
    }

    let firstChannel = result.results?.channels?.[0];
    let firstAlt = firstChannel?.alternatives?.[0];

    let channels = result.results?.channels?.map((ch: any) => ({
      alternatives: ch.alternatives?.map((alt: any) => ({
        transcript: alt.transcript || '',
        confidence: alt.confidence || 0,
        words: alt.words?.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker,
          punctuatedWord: w.punctuated_word
        })),
        paragraphs: alt.paragraphs,
        summaries: alt.summaries,
        topics: alt.topics,
        intents: alt.intents,
        sentiments: alt.sentiments
      })),
      detectedLanguage: ch.detected_language
    }));

    let transcript = firstAlt?.transcript || '';
    let words = firstAlt?.words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      speaker: w.speaker,
      punctuatedWord: w.punctuated_word
    }));

    let utterances = result.results?.utterances?.map((u: any) => ({
      start: u.start,
      end: u.end,
      confidence: u.confidence,
      channel: u.channel,
      transcript: u.transcript,
      speaker: u.speaker,
      words: u.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        speaker: w.speaker,
        punctuatedWord: w.punctuated_word
      }))
    }));

    let wordCount = words?.length || 0;
    let duration = result.metadata?.duration;
    let durationStr = duration ? ` (${Math.round(duration)}s audio)` : '';

    return {
      output: {
        requestId,
        callbackSubmitted: false,
        transcript,
        confidence: firstAlt?.confidence,
        words,
        channels,
        detectedLanguage: firstChannel?.detected_language,
        summary: result.results?.summary,
        topics: result.results?.topics,
        intents: result.results?.intents,
        sentiments: result.results?.sentiments,
        utterances,
        metadata: result.metadata
      },
      message: `Transcribed audio${durationStr}: "${transcript.substring(0, 200)}${transcript.length > 200 ? '...' : ''}" (${wordCount} words, confidence: ${((firstAlt?.confidence || 0) * 100).toFixed(1)}%)`
    };
  })
  .build();
