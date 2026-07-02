import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Get your ElevenLabs account information including subscription tier, character usage and limits, voice slots, and billing details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      firstName: z.string().optional().describe('User first name'),
      subscriptionTier: z.string().optional().describe('Current subscription tier'),
      subscriptionStatus: z
        .string()
        .optional()
        .describe('Subscription status (active, trialing, free, etc.)'),
      characterCount: z.number().optional().describe('Characters used in current period'),
      characterLimit: z.number().optional().describe('Character limit for current period'),
      voiceSlots: z.number().optional().describe('Number of available voice slots'),
      professionalVoiceLimit: z.number().optional().describe('Professional voice clone limit'),
      canExtendCharacterLimit: z
        .boolean()
        .optional()
        .describe('Whether character limit can be extended'),
      canUseInstantVoiceCloning: z
        .boolean()
        .optional()
        .describe('Whether instant voice cloning is available'),
      canUseProfessionalVoiceCloning: z
        .boolean()
        .optional()
        .describe('Whether professional voice cloning is available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let user = await client.getUser();
    let sub = user.subscription;

    return {
      output: {
        userId: user.user_id,
        firstName: user.first_name,
        subscriptionTier: sub?.tier,
        subscriptionStatus: sub?.status,
        characterCount: sub?.character_count,
        characterLimit: sub?.character_limit,
        voiceSlots: sub?.voice_limit,
        professionalVoiceLimit: sub?.professional_voice_limit,
        canExtendCharacterLimit: sub?.can_extend_character_limit,
        canUseInstantVoiceCloning: sub?.can_use_instant_voice_cloning,
        canUseProfessionalVoiceCloning: sub?.can_use_professional_voice_cloning
      },
      message: `User **${user.first_name || user.user_id}**, tier: **${sub?.tier || 'unknown'}**. Characters: ${sub?.character_count || 0}/${sub?.character_limit || 0}.`
    };
  })
  .build();
