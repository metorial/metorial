import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let getMfaFactors = SlateTool.create(spec, {
  name: 'Get MFA Factors',
  key: 'get_mfa_factors',
  description: `Retrieve MFA information for a user including both available (unenrolled) factors and enrolled devices. Provides a complete view of a user's multi-factor authentication status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The user ID to get MFA factors for')
    })
  )
  .output(
    z.object({
      availableFactors: z
        .array(
          z.object({
            factorId: z.number().describe('Factor ID for enrollment'),
            name: z.string().describe('Factor name'),
            authFactorName: z
              .string()
              .nullable()
              .optional()
              .describe('Authentication factor name')
          })
        )
        .describe('Factors available for enrollment'),
      enrolledDevices: z
        .array(
          z.object({
            deviceId: z.number().describe('Enrolled device ID'),
            displayName: z
              .string()
              .nullable()
              .optional()
              .describe('User-assigned display name'),
            typeDisplayName: z
              .string()
              .nullable()
              .optional()
              .describe('Factor type display name'),
            authFactorName: z
              .string()
              .nullable()
              .optional()
              .describe('Authentication factor name'),
            isDefault: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether this is the default MFA device')
          })
        )
        .describe('Currently enrolled MFA devices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let [available, enrolled] = await Promise.all([
      client.getAvailableFactors(ctx.input.userId),
      client.getEnrolledDevices(ctx.input.userId)
    ]);

    let availableList = Array.isArray(available) ? available : available?.data || [];
    let enrolledList = Array.isArray(enrolled) ? enrolled : enrolled?.data || [];

    let availableFactors = availableList.map((f: any) => ({
      factorId: f.factor_id,
      name: f.name,
      authFactorName: f.auth_factor_name
    }));

    let enrolledDevices = enrolledList.map((d: any) => ({
      deviceId: d.device_id,
      displayName: d.user_display_name,
      typeDisplayName: d.type_display_name,
      authFactorName: d.auth_factor_name,
      isDefault: d.default
    }));

    return {
      output: { availableFactors, enrolledDevices },
      message: `User has **${enrolledDevices.length}** enrolled device(s) and **${availableFactors.length}** available factor(s) for enrollment.`
    };
  });
