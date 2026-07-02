import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeakerRecognitionClient } from '../lib/client';
import { azureSpeechServiceError } from '../lib/errors';
import { spec } from '../spec';

export let identifySpeaker = SlateTool.create(spec, {
  name: 'Identify Speaker',
  key: 'identify_speaker',
  description: `Identifies which speaker from a group of enrolled profiles is speaking in the provided audio. Compares the audio against up to 50 candidate speaker profiles and returns the best match with a confidence score.
Uses text-independent identification — the speaker can say anything.`,
  instructions: [
    'All candidate profiles must be fully enrolled before identification.',
    'Provide up to 50 profile IDs as candidates.'
  ],
  constraints: [
    'Maximum 50 candidate profiles per request.',
    'Audio should contain at least 1 second of clear speech.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      profileIds: z
        .array(z.string())
        .describe('List of enrolled identification profile IDs to compare against (max 50)'),
      audioBase64: z
        .string()
        .describe('Base64-encoded audio data (WAV PCM 16kHz mono) of the speaker to identify')
    })
  )
  .output(
    z.object({
      identifiedProfileId: z.string().describe('Profile ID of the identified speaker'),
      recognitionResult: z.string().describe('Identification result: "Accept" or "Reject"'),
      score: z.number().describe('Confidence score from 0.0 to 1.0')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeakerRecognitionClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.profileIds.length > 50) {
      throw azureSpeechServiceError(
        'Maximum 50 candidate profiles per identification request.'
      );
    }

    if (ctx.input.profileIds.length === 0) {
      throw azureSpeechServiceError('At least one profileId is required.');
    }

    ctx.info(`Identifying speaker against ${ctx.input.profileIds.length} profiles...`);

    let result = await client.identifySpeaker(ctx.input.profileIds, ctx.input.audioBase64);

    return {
      output: {
        identifiedProfileId: result.identifiedProfile?.profileId || result.profileId || '',
        recognitionResult:
          result.identifiedProfile?.recognitionResult || result.recognitionResult || 'Reject',
        score: result.identifiedProfile?.score || result.score || 0
      },
      message:
        result.identifiedProfile?.recognitionResult === 'Accept' ||
        result.recognitionResult === 'Accept'
          ? `Speaker identified as profile \`${result.identifiedProfile?.profileId || result.profileId}\` (confidence: ${((result.identifiedProfile?.score || result.score || 0) * 100).toFixed(1)}%)`
          : `No matching speaker found among the candidate profiles.`
    };
  })
  .build();
