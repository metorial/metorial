import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let enrollMfaFactor = SlateTool.create(spec, {
  name: 'Enroll MFA Factor',
  key: 'enroll_mfa_factor',
  description: `Enroll a new MFA factor for a OneLogin user. Supports SMS, Email, Voice, Google Authenticator, OneLogin Protect, and other TOTP authenticators. After enrollment, use the registration ID to verify the factor with an OTP code.`,
  instructions: [
    'First use Get MFA Factors to find available factor IDs for the user.',
    'For SMS/Email/Voice factors, the OTP will be sent automatically on enrollment.',
    'For authenticator apps, the user must scan a QR code or enter a secret key.'
  ]
})
  .input(
    z.object({
      userId: z.number().describe('The user ID to enroll the factor for'),
      factorId: z.number().describe('Factor ID from available factors list'),
      displayName: z
        .string()
        .describe('User-facing name for this device (e.g., "Work Phone")'),
      expiresIn: z
        .number()
        .optional()
        .describe('OTP expiry in seconds (120-900, default 120)'),
      verified: z
        .boolean()
        .optional()
        .describe('Set true to pre-verify (SMS/Voice/Email only)'),
      customMessage: z
        .string()
        .optional()
        .describe('Custom SMS message template (use {{otp_code}} and {{otp_expiry}})')
    })
  )
  .output(
    z.object({
      registrationId: z.string().describe('Registration ID for verification'),
      status: z.string().describe('Enrollment status (e.g., "pending", "accepted")'),
      authFactorName: z.string().nullable().optional().describe('Factor type name'),
      typeDisplayName: z
        .string()
        .nullable()
        .optional()
        .describe('Display name of the factor type'),
      expiresAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO8601 expiry timestamp for the OTP')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let body: Record<string, any> = {
      factor_id: ctx.input.factorId,
      display_name: ctx.input.displayName
    };
    if (ctx.input.expiresIn !== undefined) body.expires_in = String(ctx.input.expiresIn);
    if (ctx.input.verified !== undefined) body.verified = ctx.input.verified;
    if (ctx.input.customMessage) body.custom_message = ctx.input.customMessage;

    let result = await client.enrollFactor(ctx.input.userId, body);
    let enrollment = Array.isArray(result) ? result[0] : result;

    return {
      output: {
        registrationId: enrollment.id,
        status: enrollment.status,
        authFactorName: enrollment.auth_factor_name,
        typeDisplayName: enrollment.type_display_name,
        expiresAt: enrollment.expires_at
      },
      message: `Enrolled MFA factor **${enrollment.auth_factor_name || enrollment.type_display_name}** for user ${ctx.input.userId}. Status: **${enrollment.status}**. Registration ID: \`${enrollment.id}\``
    };
  });
