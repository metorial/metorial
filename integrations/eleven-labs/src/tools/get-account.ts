import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve current user profile and subscription details including character usage, voice slots, billing period, and plan tier.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      firstName: z.string().optional().describe('User first name'),
      tier: z.string().optional().describe('Subscription tier'),
      characterCount: z
        .number()
        .optional()
        .describe('Characters used in current billing period'),
      characterLimit: z
        .number()
        .optional()
        .describe('Maximum characters allowed in current billing period'),
      voiceSlotsUsed: z.number().optional().describe('Number of voice slots in use'),
      maxVoiceSlots: z.number().optional().describe('Maximum voice slots available'),
      canUseInstantVoiceCloning: z
        .boolean()
        .optional()
        .describe('Whether instant voice cloning is available'),
      canUseProfessionalVoiceCloning: z
        .boolean()
        .optional()
        .describe('Whether professional voice cloning is available'),
      status: z.string().optional().describe('Subscription status'),
      billingPeriod: z
        .string()
        .optional()
        .describe('Billing period (e.g. monthly_period, annual_period)'),
      nextCharacterCountReset: z
        .number()
        .optional()
        .describe('Unix timestamp of next character count reset'),
      currency: z.string().optional().describe('Billing currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let [user, subscription] = await Promise.all([
      client.getUser() as Promise<Record<string, unknown>>,
      client.getSubscription() as Promise<Record<string, unknown>>
    ]);

    return {
      output: {
        userId: user.user_id as string | undefined,
        firstName: user.first_name as string | undefined,
        tier: subscription.tier as string | undefined,
        characterCount: subscription.character_count as number | undefined,
        characterLimit: subscription.character_limit as number | undefined,
        voiceSlotsUsed: subscription.voice_slots_used as number | undefined,
        maxVoiceSlots: subscription.max_voice_slots as number | undefined,
        canUseInstantVoiceCloning: subscription.can_use_instant_voice_cloning as
          | boolean
          | undefined,
        canUseProfessionalVoiceCloning: subscription.can_use_professional_voice_cloning as
          | boolean
          | undefined,
        status: subscription.status as string | undefined,
        billingPeriod: subscription.billing_period as string | undefined,
        nextCharacterCountReset: subscription.next_character_count_reset as number | undefined,
        currency: subscription.currency as string | undefined
      },
      message: `Account: **${user.first_name || 'N/A'}** | Tier: **${subscription.tier}** | Characters: ${subscription.character_count}/${subscription.character_limit} | Voice slots: ${subscription.voice_slots_used}/${subscription.max_voice_slots}`
    };
  })
  .build();
