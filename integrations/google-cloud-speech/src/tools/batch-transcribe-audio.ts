import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

export let batchTranscribeAudio = SlateTool.create(spec, {
  name: 'Batch Transcribe Audio',
  key: 'batch_transcribe_audio',
  description: `Start an asynchronous batch transcription of one or more audio files stored in Google Cloud Storage. Returns a long-running operation that can be monitored using the Get Operation tool.

Suitable for audio files longer than 1 minute (up to 8 hours). Results can be written to a GCS output location or returned inline when the operation completes.`,
  instructions: [
    'All audio files must be in Google Cloud Storage (gs:// URIs).',
    'Use the Get Operation tool to check the status and retrieve results when done.'
  ],
  constraints: [
    'Audio files must be in Google Cloud Storage.',
    'Maximum audio duration is 480 minutes (8 hours) per file.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.batchTranscribeAudio)
  .input(
    z.object({
      fileUris: z
        .array(z.string())
        .describe(
          'Google Cloud Storage URIs of audio files to transcribe (e.g. ["gs://bucket/audio1.wav", "gs://bucket/audio2.mp3"]).'
        ),
      recognizerId: z
        .string()
        .optional()
        .describe(
          'ID of a pre-configured recognizer. If omitted, uses the default recognizer.'
        ),
      model: z
        .string()
        .optional()
        .describe('Recognition model to use (e.g. "latest_long", "chirp", "chirp_2").'),
      languageCodes: z
        .array(z.string())
        .optional()
        .describe('BCP-47 language codes (e.g. ["en-US"]).'),
      outputUri: z
        .string()
        .optional()
        .describe(
          'GCS URI for writing transcription results. If omitted, results are returned inline.'
        ),
      enableAutomaticPunctuation: z
        .boolean()
        .optional()
        .describe('Enable automatic punctuation.'),
      enableWordTimeOffsets: z
        .boolean()
        .optional()
        .describe('Include word time offsets in results.'),
      enableWordConfidence: z.boolean().optional().describe('Include word confidence scores.'),
      minSpeakerCount: z.number().optional().describe('Minimum speakers for diarization.'),
      maxSpeakerCount: z.number().optional().describe('Maximum speakers for diarization.')
    })
  )
  .output(
    z.object({
      operationName: z
        .string()
        .describe(
          'Name of the long-running operation. Use this with Get Operation to check status.'
        ),
      done: z.boolean().describe('Whether the operation completed immediately.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.config.region
    });

    ctx.info(`Starting batch transcription of ${ctx.input.fileUris.length} file(s)...`);

    let response = await client.batchRecognize({
      fileUris: ctx.input.fileUris,
      recognizerId: ctx.input.recognizerId,
      model: ctx.input.model,
      languageCodes: ctx.input.languageCodes,
      outputUri: ctx.input.outputUri,
      enableAutomaticPunctuation: ctx.input.enableAutomaticPunctuation,
      enableWordTimeOffsets: ctx.input.enableWordTimeOffsets,
      enableWordConfidence: ctx.input.enableWordConfidence,
      minSpeakerCount: ctx.input.minSpeakerCount,
      maxSpeakerCount: ctx.input.maxSpeakerCount
    });

    return {
      output: {
        operationName: response.name || '',
        done: response.done || false
      },
      message: `Batch transcription started. Operation: **${response.name}**. Use the Get Operation tool to monitor progress.`
    };
  })
  .build();
