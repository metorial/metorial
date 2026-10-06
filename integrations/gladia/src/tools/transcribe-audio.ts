import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareTranscriptionFiles, subtitleFileSchema } from '../lib/results';
import type { TranscriptionRequestParams } from '../lib/types';
import { spec } from '../spec';

let customVocabularyEntrySchema = z.union([
  z.string().describe('A simple vocabulary term'),
  z.object({
    value: z.string().describe('The vocabulary term'),
    intensity: z.number().min(0).max(1).optional().describe('Intensity of the term (0-1)'),
    pronunciations: z
      .array(z.string())
      .optional()
      .describe('Possible pronunciations of the term'),
    language: z.string().optional().describe('Language code for the term')
  })
]);

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Submit an audio or video URL for asynchronous transcription, with language detection, speaker diarization, translation, summarization, sentiment analysis, entities, custom prompts, and subtitles. Returns a job ID for Get Transcription. Generated subtitles are available as downloadable files.`,
  instructions: [
    'Provide an audio URL — either a publicly accessible URL or one obtained from the Upload Audio tool.',
    'Enable audio intelligence features as needed by setting their respective flags to true.',
    'If you need the full result immediately, use the waitForCompletion option (up to 5 minutes).'
  ],
  constraints: [
    'Only accepts audio/video URLs. Upload Audio also requires a publicly accessible file URL.',
    'Processing time depends on audio duration and enabled features.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      audioUrl: z.string().url().describe('URL of the audio or video file to transcribe'),
      model: z
        .enum(['solaria-1', 'solaria-3', 'solaria-fusion'])
        .optional()
        .describe('Transcription model. Defaults to solaria-1.'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'If true, polls until transcription is complete (up to ~5 min). Defaults to false.'
        ),

      languages: z
        .array(z.string())
        .optional()
        .describe(
          'ISO 639 language codes for expected languages. Leave empty for auto-detection.'
        ),
      codeSwitching: z
        .boolean()
        .optional()
        .describe('Enable automatic language switching detection within the audio'),

      diarization: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization to identify different speakers'),
      numberOfSpeakers: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Exact number of speakers (if known)'),
      minSpeakers: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Minimum number of expected speakers'),
      maxSpeakers: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Maximum number of expected speakers'),

      translation: z.boolean().optional().describe('Enable translation of the transcript'),
      targetLanguages: z
        .array(z.string())
        .optional()
        .describe('ISO 639-1 target language codes for translation'),
      translationModel: z
        .enum(['base', 'batch', 'enhanced'])
        .optional()
        .describe('Translation model quality'),

      summarization: z.boolean().optional().describe('Enable summarization of the transcript'),
      summarizationType: z
        .enum(['general', 'concise', 'bullet_points'])
        .optional()
        .describe('Type of summary to generate'),

      sentimentAnalysis: z
        .boolean()
        .optional()
        .describe('Enable sentiment and emotion analysis'),
      namedEntityRecognition: z
        .boolean()
        .optional()
        .describe('Enable named entity recognition'),
      chapterization: z
        .boolean()
        .optional()
        .describe('Discontinued by Gladia. Use audioToLlm with a chapter prompt.'),
      moderation: z
        .boolean()
        .optional()
        .describe(
          'Legacy option, absent from the current documented request API. Use audioToLlm with a moderation prompt.'
        ),
      nameConsistency: z
        .boolean()
        .optional()
        .describe(
          'Legacy option, absent from the current documented request API. Use customSpelling for known names.'
        ),

      audioToLlm: z
        .boolean()
        .optional()
        .describe('Enable custom LLM prompts on the transcript'),
      audioToLlmPrompts: z
        .array(z.string())
        .optional()
        .describe('Custom prompts to run against the transcript'),

      subtitles: z.boolean().optional().describe('Enable subtitle generation'),
      subtitleFormats: z
        .array(z.enum(['srt', 'vtt']))
        .optional()
        .describe('Subtitle formats to generate'),

      customVocabulary: z
        .boolean()
        .optional()
        .describe('Enable custom vocabulary for domain-specific terms'),
      vocabularyTerms: z
        .array(customVocabularyEntrySchema)
        .optional()
        .describe('Custom vocabulary terms to boost recognition'),

      customSpelling: z.boolean().optional().describe('Enable custom spelling corrections'),
      spellingEntries: z
        .array(
          z.object({
            value: z.string().describe('The correct spelling'),
            pronunciations: z
              .array(z.string())
              .describe('Pronunciations that should map to this spelling')
          })
        )
        .optional()
        .describe('Custom spelling corrections (e.g., "SQL" for "Sequel")'),

      structuredDataExtraction: z
        .boolean()
        .optional()
        .describe(
          'Legacy option, absent from the current documented request API. Use audioToLlm with an extraction prompt.'
        ),
      extractionClasses: z
        .array(z.string())
        .optional()
        .describe('Entity classes to extract (e.g., "person", "organization")'),

      sentences: z
        .boolean()
        .optional()
        .describe('Enable sentence-level segmentation in output'),

      callbackUrl: z
        .string()
        .url()
        .optional()
        .describe(
          'URL to receive the result via a POST callback when transcription completes'
        ),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arbitrary key-value metadata to attach to the transcription')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('Unique ID of the transcription job'),
      resultUrl: z.string().describe('URL to poll for transcription results'),
      status: z
        .string()
        .optional()
        .describe('Current status of the transcription (if waitForCompletion was used)'),
      fullTranscript: z
        .string()
        .optional()
        .describe('Full transcript text (if waitForCompletion was used and completed)'),
      utterances: z
        .array(
          z.object({
            text: z.string(),
            language: z.string(),
            start: z.number(),
            end: z.number(),
            confidence: z.number(),
            channel: z.number(),
            speaker: z.number().optional()
          })
        )
        .optional()
        .describe('Transcript utterances (if waitForCompletion was used and completed)'),
      subtitleFiles: z
        .array(subtitleFileSchema)
        .optional()
        .describe('Downloadable subtitle file metadata.'),
      result: z
        .any()
        .optional()
        .describe(
          'Full transcription result including all enabled features (if waitForCompletion was used)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let configuredFeatures = [
      ['diarization', ['numberOfSpeakers', 'minSpeakers', 'maxSpeakers']],
      ['translation', ['targetLanguages', 'translationModel']],
      ['summarization', ['summarizationType']],
      ['audioToLlm', ['audioToLlmPrompts']],
      ['subtitles', ['subtitleFormats']],
      ['customVocabulary', ['vocabularyTerms']],
      ['customSpelling', ['spellingEntries']]
    ] as const;
    for (let [flag, fields] of configuredFeatures) {
      if (!ctx.input[flag] && fields.some(field => ctx.input[field] !== undefined)) {
        throw createApiServiceError(`Enable ${flag} to use its configuration fields.`);
      }
    }

    for (let option of [
      'chapterization',
      'moderation',
      'nameConsistency',
      'structuredDataExtraction'
    ] as const) {
      if (ctx.input[option])
        throw createApiServiceError(
          `The current Gladia request API does not support ${option}. Use audioToLlmPrompts or customSpelling instead.`,
          { reason: 'gladia_unsupported_option' }
        );
    }
    if (ctx.input.extractionClasses !== undefined) {
      throw createApiServiceError(
        'extractionClasses is absent from the current Gladia API. Use audioToLlmPrompts for extraction.'
      );
    }
    if (ctx.input.translation && !ctx.input.targetLanguages?.length) {
      throw createApiServiceError(
        'Provide at least one targetLanguages entry when translation is enabled.'
      );
    }
    if (ctx.input.audioToLlm && !ctx.input.audioToLlmPrompts?.length) {
      throw createApiServiceError('Provide audioToLlmPrompts when audioToLlm is enabled.');
    }
    if (ctx.input.customVocabulary && !ctx.input.vocabularyTerms?.length) {
      throw createApiServiceError('Provide vocabularyTerms when customVocabulary is enabled.');
    }
    if (ctx.input.customSpelling && !ctx.input.spellingEntries?.length) {
      throw createApiServiceError('Provide spellingEntries when customSpelling is enabled.');
    }
    if (
      ctx.input.minSpeakers !== undefined &&
      ctx.input.maxSpeakers !== undefined &&
      ctx.input.minSpeakers > ctx.input.maxSpeakers
    ) {
      throw createApiServiceError('minSpeakers must not exceed maxSpeakers.');
    }
    if (
      ctx.input.numberOfSpeakers !== undefined &&
      (ctx.input.minSpeakers !== undefined || ctx.input.maxSpeakers !== undefined)
    ) {
      throw createApiServiceError(
        'Use numberOfSpeakers or minSpeakers/maxSpeakers, not both.'
      );
    }
    let params: TranscriptionRequestParams = {
      audio_url: ctx.input.audioUrl,
      model: ctx.input.model
    };

    if (ctx.input.languages !== undefined || ctx.input.codeSwitching !== undefined) {
      params.language_config = {
        languages: ctx.input.languages,
        code_switching: ctx.input.codeSwitching
      };
    }

    if (ctx.input.diarization) {
      params.diarization = true;
      if (
        ctx.input.numberOfSpeakers !== undefined ||
        ctx.input.minSpeakers !== undefined ||
        ctx.input.maxSpeakers !== undefined
      ) {
        params.diarization_config = {
          number_of_speakers: ctx.input.numberOfSpeakers,
          min_speakers: ctx.input.minSpeakers,
          max_speakers: ctx.input.maxSpeakers
        };
      }
    }

    if (ctx.input.translation) {
      params.translation = true;
      if (ctx.input.targetLanguages || ctx.input.translationModel) {
        params.translation_config = {
          target_languages: ctx.input.targetLanguages,
          model: ctx.input.translationModel
        };
      }
    }

    if (ctx.input.summarization) {
      params.summarization = true;
      if (ctx.input.summarizationType) {
        params.summarization_config = { type: ctx.input.summarizationType };
      }
    }

    if (ctx.input.sentimentAnalysis) params.sentiment_analysis = true;
    if (ctx.input.namedEntityRecognition) params.named_entity_recognition = true;
    if (ctx.input.sentences) params.sentences = true;

    if (ctx.input.audioToLlm) {
      params.audio_to_llm = true;
      if (ctx.input.audioToLlmPrompts) {
        params.audio_to_llm_config = { prompts: ctx.input.audioToLlmPrompts };
      }
    }

    if (ctx.input.subtitles) {
      params.subtitles = true;
      if (ctx.input.subtitleFormats) {
        params.subtitles_config = { formats: ctx.input.subtitleFormats };
      }
    }

    if (ctx.input.customVocabulary) {
      params.custom_vocabulary = true;
      if (ctx.input.vocabularyTerms) {
        params.custom_vocabulary_config = { vocabulary: ctx.input.vocabularyTerms };
      }
    }

    if (ctx.input.customSpelling) {
      params.custom_spelling = true;
      if (ctx.input.spellingEntries) {
        params.custom_spelling_config = {
          spelling_dictionary: Object.fromEntries(
            ctx.input.spellingEntries.map(entry => [entry.value, entry.pronunciations])
          )
        };
      }
    }

    if (ctx.input.callbackUrl) {
      params.callback = true;
      params.callback_config = { url: ctx.input.callbackUrl, method: 'POST' };
    }

    if (ctx.input.customMetadata) {
      params.custom_metadata = ctx.input.customMetadata;
    }

    ctx.info('Initiating transcription...');
    let initResult = await client.initiateTranscription(params);

    if (ctx.input.waitForCompletion) {
      ctx.info('Waiting for transcription to complete...');
      let result = await client.pollTranscriptionUntilDone(initResult.id);

      if (result.status === 'error') {
        ctx.error(`Transcription failed with error code: ${result.error_code}`);
        return {
          output: {
            transcriptionId: result.id,
            resultUrl: initResult.result_url,
            status: result.status
          },
          message: `Transcription **failed** with error code \`${result.error_code}\`.`
        };
      }

      let prepared = await prepareTranscriptionFiles(result, file => ctx.addAttachment(file));
      let utterances = result.result?.transcription?.utterances?.map(u => ({
        text: u.text,
        language: u.language,
        start: u.start,
        end: u.end,
        confidence: u.confidence,
        channel: u.channel,
        speaker: u.speaker
      }));

      return {
        output: {
          transcriptionId: result.id,
          resultUrl: initResult.result_url,
          status: result.status,
          fullTranscript: result.result?.transcription?.full_transcript,
          utterances,
          result: prepared.result,
          subtitleFiles: prepared.subtitleFiles
        },
        message: `Transcription **completed** successfully. Duration: ${result.result?.metadata?.audio_duration?.toFixed(1)}s. Transcript: "${result.result?.transcription?.full_transcript?.substring(0, 200)}${(result.result?.transcription?.full_transcript?.length ?? 0) > 200 ? '...' : ''}"`
      };
    }

    return {
      output: {
        transcriptionId: initResult.id,
        resultUrl: initResult.result_url
      },
      message: `Transcription job **submitted** with ID \`${initResult.id}\`. Use **Get Transcription** to check the status and retrieve results.`
    };
  })
  .build();
