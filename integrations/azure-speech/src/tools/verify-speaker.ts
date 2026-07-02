import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeakerRecognitionClient } from '../lib/client';
import { spec } from '../spec';

export let verifySpeaker = SlateTool.create(spec, {
  name: 'Verify Speaker',
  key: 'verify_speaker',
  description: `Verifies whether a speaker matches a previously enrolled voice profile. Compares the provided audio against the enrolled profile and returns a confidence score and accept/reject decision.
Uses text-independent verification — the speaker can say anything.`,
  instructions: [
    'The speaker profile must be fully enrolled before verification. Use the Manage Speaker Profile tool to check enrollment status.',
    'Audio should be at least 1 second of clear speech in WAV format (16kHz, 16-bit, mono PCM).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('ID of the enrolled verification profile to match against'),
      audioBase64: z
        .string()
        .describe('Base64-encoded audio data (WAV PCM 16kHz mono) of the speaker to verify')
    })
  )
  .output(
    z.object({
      recognitionResult: z.string().describe('Verification result: "Accept" or "Reject"'),
      score: z.number().describe('Confidence score from 0.0 to 1.0')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeakerRecognitionClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Verifying speaker against profile ${ctx.input.profileId}...`);

    let result = await client.verifySpeaker(ctx.input.profileId, ctx.input.audioBase64);

    return {
      output: {
        recognitionResult: result.recognitionResult,
        score: result.score
      },
      message: `Speaker verification result: **${result.recognitionResult}** (confidence: ${(result.score * 100).toFixed(1)}%)`
    };
  })
  .build();
