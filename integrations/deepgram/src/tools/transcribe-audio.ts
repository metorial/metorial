import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let transcriptionOptionsSchema = z.object({
  model: z
    .string()
    .optional()
    .describe(
      'Model to use for transcription (e.g., "nova-3", "nova-2", "whisper-large"). Defaults to the latest general model.'
    ),
  language: z
    .string()
    .optional()
    .describe(
      'BCP-47 language code (e.g., "en", "es", "fr"). If not set, automatic language detection is used.'
    ),
  detectLanguage: z.boolean().optional().describe('Enable automatic language detection.'),
  punctuate: z.boolean().optional().describe('Add punctuation to the transcript.'),
  smartFormat: z
    .boolean()
    .optional()
    .describe('Enable smart formatting for currencies, phone numbers, emails, etc.'),
  diarize: z
    .boolean()
    .optional()
    .describe('Identify and label different speakers in the audio.'),
  utterances: z
    .boolean()
    .optional()
    .describe('Segment transcript into utterances (speaker turns).'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Keywords to boost recognition for (e.g., ["Deepgram", "AI"]).'),
  search: z.array(z.string()).optional().describe('Terms to search for in the transcript.'),
  summarize: z.boolean().optional().describe('Generate a summary of the transcript.'),
  topics: z.boolean().optional().describe('Detect topics discussed in the audio.'),
  intents: z.boolean().optional().describe('Detect intents in the audio.'),
  sentiment: z.boolean().optional().describe('Analyze sentiment of the transcript.'),
  paragraphs: z.boolean().optional().describe('Split transcript into paragraphs.'),
  redact: z
    .array(z.string())
    .optional()
    .describe('Types of information to redact (e.g., ["pci", "ssn", "numbers"]).'),
  tag: z.string().optional().describe('Tag for tracking the request in usage reports.')
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

export let transcribeAudioTool = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe pre-recorded audio to text. Supports audio from a URL or raw audio data (base64-encoded). Provides options for model selection, language detection, speaker diarization, smart formatting, keyword boosting, and text intelligence features (summarization, topic detection, sentiment analysis). Returns the full transcript with word-level timestamps and confidence scores.`,
  instructions: [
    'Provide either an audioUrl OR audioData+mimetype, not both.',
    'For best results with smart formatting, use the "nova-3" model.',
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
        .describe('URL of the audio file to transcribe. Use this OR audioData, not both.'),
      audioData: z
        .string()
        .optional()
        .describe('Base64-encoded audio data. Must also provide mimetype.'),
      mimetype: z
        .string()
        .optional()
        .describe(
          'MIME type of the audio data (e.g., "audio/wav", "audio/mp3"). Required when using audioData.'
        ),
      ...transcriptionOptionsSchema.shape
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique request identifier.'),
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

    if (!ctx.input.audioUrl && !ctx.input.audioData) {
      throw new Error('Either audioUrl or audioData must be provided.');
    }

    let result: any;

    if (ctx.input.audioUrl) {
      result = await client.transcribeUrl({
        url: ctx.input.audioUrl,
        model: ctx.input.model,
        language: ctx.input.language,
        detectLanguage: ctx.input.detectLanguage,
        punctuate: ctx.input.punctuate,
        smartFormat: ctx.input.smartFormat,
        diarize: ctx.input.diarize,
        utterances: ctx.input.utterances,
        keywords: ctx.input.keywords,
        search: ctx.input.search,
        summarize: ctx.input.summarize,
        topics: ctx.input.topics,
        intents: ctx.input.intents,
        sentiment: ctx.input.sentiment,
        paragraphs: ctx.input.paragraphs,
        redact: ctx.input.redact,
        tag: ctx.input.tag
      });
    } else {
      if (!ctx.input.mimetype) {
        throw new Error('mimetype is required when providing audioData.');
      }
      result = await client.transcribeAudio({
        audioData: ctx.input.audioData!,
        mimetype: ctx.input.mimetype,
        model: ctx.input.model,
        language: ctx.input.language,
        detectLanguage: ctx.input.detectLanguage,
        punctuate: ctx.input.punctuate,
        smartFormat: ctx.input.smartFormat,
        diarize: ctx.input.diarize,
        utterances: ctx.input.utterances,
        keywords: ctx.input.keywords,
        search: ctx.input.search,
        summarize: ctx.input.summarize,
        topics: ctx.input.topics,
        intents: ctx.input.intents,
        sentiment: ctx.input.sentiment,
        paragraphs: ctx.input.paragraphs,
        redact: ctx.input.redact,
        tag: ctx.input.tag
      });
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
        requestId: result.metadata?.request_id,
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
