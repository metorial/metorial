import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let recognizeSpeech = SlateTool.create(spec, {
  name: 'Recognize Speech',
  key: 'recognize_speech',
  description: `Performs real-time speech-to-text recognition on short audio (up to 60 seconds). Converts spoken audio into text using Azure's speech recognition engine.
Optionally includes **pronunciation assessment** to evaluate the accuracy, fluency, completeness, and prosody of spoken audio against a reference text.`,
  instructions: [
    'Provide audio data as a base64-encoded string in WAV (PCM, 16kHz mono) or OGG (Opus) format.',
    'Set format to "detailed" for confidence scores and N-best alternatives.',
    'For pronunciation assessment, provide a referenceText and configure assessment parameters.'
  ],
  constraints: [
    'Audio must be 60 seconds or less (30 seconds for pronunciation assessment).',
    'Only WAV (PCM 16kHz mono) and OGG (Opus) formats are supported.',
    'Does not support speech translation or partial results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      audioBase64: z
        .string()
        .describe('Base64-encoded audio data (WAV PCM 16kHz mono or OGG Opus)'),
      language: z.string().describe('Language of the spoken audio (e.g., "en-US", "de-DE")'),
      audioFormat: z
        .enum(['wav', 'ogg'])
        .optional()
        .default('wav')
        .describe('Audio format: "wav" or "ogg"'),
      resultFormat: z
        .enum(['simple', 'detailed'])
        .optional()
        .default('simple')
        .describe(
          '"simple" for basic results, "detailed" for N-best list with confidence scores'
        ),
      profanityHandling: z
        .enum(['masked', 'removed', 'raw'])
        .optional()
        .describe('How to handle profanity in results'),
      pronunciationAssessment: z
        .object({
          referenceText: z
            .string()
            .describe('The expected text to compare pronunciation against'),
          gradingSystem: z
            .enum(['FivePoint', 'HundredMark'])
            .optional()
            .describe('Scoring scale (default HundredMark)'),
          granularity: z
            .enum(['Phoneme', 'Word', 'FullText'])
            .optional()
            .describe('Level of scoring detail (default Phoneme)'),
          dimension: z
            .enum(['Basic', 'Comprehensive'])
            .optional()
            .describe(
              '"Basic" for accuracy only, "Comprehensive" for fluency, completeness, prosody'
            ),
          enableMiscue: z
            .boolean()
            .optional()
            .describe('Detect omitted, inserted, or repeated words'),
          enableProsodyAssessment: z
            .boolean()
            .optional()
            .describe('Assess stress, intonation, speed, and rhythm')
        })
        .optional()
        .describe('Enable pronunciation assessment with these parameters')
    })
  )
  .output(
    z.object({
      recognitionStatus: z
        .string()
        .describe('Recognition result status (e.g., "Success", "NoMatch", "Error")'),
      displayText: z
        .string()
        .optional()
        .describe('Recognized text with punctuation and capitalization'),
      offset: z.string().optional().describe('Start time offset in 100-nanosecond units'),
      duration: z.string().optional().describe('Duration in 100-nanosecond units'),
      nBest: z
        .array(
          z.object({
            confidence: z.number().describe('Confidence score from 0.0 to 1.0'),
            display: z.string().describe('Display form of recognized text'),
            lexical: z.string().optional().describe('Lexical form (actual words recognized)'),
            accuracyScore: z.number().optional().describe('Pronunciation accuracy score'),
            fluencyScore: z.number().optional().describe('Speech fluency score'),
            completenessScore: z.number().optional().describe('Speech completeness score'),
            prosodyScore: z.number().optional().describe('Prosody naturalness score'),
            pronunciationScore: z.number().optional().describe('Overall pronunciation score')
          })
        )
        .optional()
        .describe(
          'N-best recognition alternatives (only with detailed format or pronunciation assessment)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let contentType =
      ctx.input.audioFormat === 'ogg'
        ? 'audio/ogg; codecs=opus'
        : 'audio/wav; codecs=audio/pcm; samplerate=16000';

    let format = ctx.input.pronunciationAssessment ? 'detailed' : ctx.input.resultFormat;

    ctx.info('Recognizing speech...');

    let result = await client.recognizeShortAudio({
      audioData: ctx.input.audioBase64,
      language: ctx.input.language,
      format: format as 'simple' | 'detailed',
      profanity: ctx.input.profanityHandling,
      contentType,
      pronunciationAssessment: ctx.input.pronunciationAssessment
        ? {
            referenceText: ctx.input.pronunciationAssessment.referenceText,
            gradingSystem: ctx.input.pronunciationAssessment.gradingSystem,
            granularity: ctx.input.pronunciationAssessment.granularity,
            dimension: ctx.input.pronunciationAssessment.dimension,
            enableMiscue: ctx.input.pronunciationAssessment.enableMiscue,
            enableProsodyAssessment: ctx.input.pronunciationAssessment.enableProsodyAssessment
          }
        : undefined
    });

    let nBest = result.NBest?.map((n: any) => ({
      confidence: n.Confidence,
      display: n.Display,
      lexical: n.Lexical,
      accuracyScore: n.AccuracyScore,
      fluencyScore: n.FluencyScore,
      completenessScore: n.CompletenessScore,
      prosodyScore: n.ProsodyScore,
      pronunciationScore: n.PronScore
    }));

    return {
      output: {
        recognitionStatus: result.RecognitionStatus,
        displayText: result.DisplayText,
        offset: result.Offset?.toString(),
        duration: result.Duration?.toString(),
        nBest
      },
      message:
        result.RecognitionStatus === 'Success'
          ? `Speech recognized: "${result.DisplayText}"`
          : `Recognition status: **${result.RecognitionStatus}**`
    };
  })
  .build();
