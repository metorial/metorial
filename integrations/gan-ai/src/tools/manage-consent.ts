import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let manageConsent = SlateTool.create(spec, {
  name: 'Manage Avatar Consent',
  key: 'manage_avatar_consent',
  description: `Manage the consent verification process for an avatar. Can either retrieve the consent passcode that must be spoken in the consent video, or submit a consent video for verification. Consent is required before an avatar can be used to generate videos.`,
  instructions: [
    'First use action "get_passcode" to retrieve the passcode, then record a video of the avatar subject speaking the passcode, then use action "submit_consent" to submit the consent video.'
  ]
})
  .input(
    z.object({
      avatarId: z.string().describe('Avatar ID to manage consent for'),
      action: z.enum(['get_passcode', 'submit_consent']).describe('Action to perform'),
      consentVideoUrl: z
        .string()
        .optional()
        .describe(
          'Public URL of consent video (required for submit_consent, MP4, max 100MB, max 30s)'
        )
    })
  )
  .output(
    z.object({
      passcode: z
        .string()
        .optional()
        .describe('Consent passcode to be spoken in the consent video'),
      passcodeExpiresAt: z.number().optional().describe('Passcode expiration timestamp'),
      consentSubmitted: z
        .boolean()
        .optional()
        .describe('Whether the consent video was submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.action === 'get_passcode') {
      let result = await client.getConsentPasscode(ctx.input.avatarId);
      return {
        output: {
          passcode: result.passcode,
          passcodeExpiresAt: result.expire_at
        },
        message: `Consent passcode: **${result.passcode}**. Record a video speaking this passcode and submit it.`
      };
    }

    if (!ctx.input.consentVideoUrl) {
      throw new Error('consentVideoUrl is required for submit_consent action');
    }

    let submitted = await client.submitConsent({
      avatarId: ctx.input.avatarId,
      consentVideoUrl: ctx.input.consentVideoUrl
    });

    return {
      output: {
        consentSubmitted: submitted
      },
      message: submitted
        ? 'Consent video submitted successfully. The avatar will be processed and verified.'
        : 'Consent video submission returned false. Please check the video meets requirements.'
    };
  })
  .build();
