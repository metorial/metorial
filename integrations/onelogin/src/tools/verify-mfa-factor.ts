import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let verifyMfaFactor = SlateTool.create(spec, {
  name: 'Verify MFA Factor',
  key: 'verify_mfa_factor',
  description: `Verify an MFA factor enrollment by submitting the OTP code. Use this after enrolling a factor to complete the registration. For push-based factors like OneLogin Protect and Voice, use the poll option to check completion status.`
})
  .input(
    z.object({
      userId: z.number().describe('The user ID'),
      registrationId: z.string().describe('Registration ID from enrollment'),
      otp: z
        .string()
        .optional()
        .describe('One-time password code (required for SMS, Email, Authenticator)'),
      poll: z
        .boolean()
        .optional()
        .describe(
          'Set true to poll enrollment status instead of verifying OTP (for Voice/Protect)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Verification status (e.g., "accepted", "pending")'),
      deviceId: z
        .string()
        .nullable()
        .optional()
        .describe('Device ID if verification succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.poll) {
      let result = await client.pollEnrollment(ctx.input.userId, ctx.input.registrationId);
      let enrollment = Array.isArray(result) ? result[0] : result;
      return {
        output: {
          status: enrollment.status,
          deviceId: enrollment.device_id ? String(enrollment.device_id) : null
        },
        message: `Enrollment status: **${enrollment.status}**.`
      };
    }

    if (!ctx.input.otp) {
      throw new Error(
        'OTP is required for verification. Use poll=true for push-based factors.'
      );
    }

    let result = await client.verifyEnrollment(
      ctx.input.userId,
      ctx.input.registrationId,
      ctx.input.otp
    );
    let enrollment = Array.isArray(result) ? result[0] : result;

    return {
      output: {
        status: enrollment.status,
        deviceId: enrollment.device_id ? String(enrollment.device_id) : null
      },
      message: `Verification status: **${enrollment.status}**.${enrollment.device_id ? ` Device ID: \`${enrollment.device_id}\`` : ''}`
    };
  });
