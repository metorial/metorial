import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let factorSchema = z.object({
  factorId: z.string(),
  factorType: z
    .string()
    .describe('Factor type (sms, email, token:software:totp, push, question, etc.)'),
  provider: z.string().describe('Factor provider (OKTA, GOOGLE, RSA, etc.)'),
  status: z.string().describe('Factor status (ACTIVE, PENDING_ACTIVATION, etc.)'),
  created: z.string().optional(),
  lastUpdated: z.string().optional(),
  profile: z
    .record(z.string(), z.any())
    .optional()
    .describe('Factor-specific profile (e.g. phone number for SMS)')
});

export let manageUserFactorsTool = SlateTool.create(spec, {
  name: 'Manage User Factors',
  key: 'manage_user_factors',
  description: `List, enroll, or reset MFA factors for an Okta user. Supports SMS, email, TOTP, push, and other factor types.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'enroll', 'reset_all'])
        .describe(
          'Operation: list enrolled factors, enroll a new factor, or reset all factors'
        ),
      userId: z.string().describe('Okta user ID'),
      factorType: z
        .string()
        .optional()
        .describe('Factor type for enrollment (e.g. sms, email, token:software:totp)'),
      provider: z
        .string()
        .optional()
        .describe('Factor provider for enrollment (e.g. OKTA, GOOGLE)'),
      factorProfile: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Factor profile data for enrollment (e.g. { phoneNumber: "+1-555-1234" } for SMS)'
        )
    })
  )
  .output(
    z.object({
      userId: z.string(),
      action: z.string(),
      success: z.boolean(),
      factors: z.array(factorSchema).optional().describe('Enrolled factors (for list action)'),
      enrolledFactor: factorSchema
        .optional()
        .describe('Newly enrolled factor (for enroll action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let { action, userId } = ctx.input;

    if (action === 'list') {
      let factors = await client.listFactors(userId);
      let mapped = factors.map(f => ({
        factorId: f.id,
        factorType: f.factorType,
        provider: f.provider,
        status: f.status,
        created: f.created,
        lastUpdated: f.lastUpdated,
        profile: f.profile
      }));
      return {
        output: { userId, action, success: true, factors: mapped },
        message: `User \`${userId}\` has **${mapped.length}** enrolled factor(s).`
      };
    }

    if (action === 'enroll') {
      if (!ctx.input.factorType) throw new Error('Factor type is required for enrollment');
      if (!ctx.input.provider) throw new Error('Provider is required for enrollment');

      let factor = await client.enrollFactor(userId, {
        factorType: ctx.input.factorType,
        provider: ctx.input.provider,
        profile: ctx.input.factorProfile
      });

      return {
        output: {
          userId,
          action,
          success: true,
          enrolledFactor: {
            factorId: factor.id,
            factorType: factor.factorType,
            provider: factor.provider,
            status: factor.status,
            created: factor.created,
            lastUpdated: factor.lastUpdated,
            profile: factor.profile
          }
        },
        message: `Enrolled **${factor.factorType}** factor (${factor.provider}) for user \`${userId}\` — status: ${factor.status}.`
      };
    }

    if (action === 'reset_all') {
      await client.resetFactors(userId);
      return {
        output: { userId, action, success: true },
        message: `Reset all MFA factors for user \`${userId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
