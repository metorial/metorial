import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyPhoneTool = SlateTool.create(spec, {
  name: 'Verify Phone',
  key: 'verify_phone',
  description: `Verify a phone number through syntax validation, range checks, and network-level connection status. Returns the verified number in national and international formats, line type (mobile/landline), and connection status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('The phone number to verify'),
      defaultCountryCode: z
        .string()
        .describe(
          'ISO 2-letter country code used as default when the number lacks a calling code (e.g., "NZ", "AU", "US")'
        ),
      mobileOnly: z
        .boolean()
        .optional()
        .describe('Restrict verification to mobile phone numbers only'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum wait time in seconds; returns "indeterminate" if exceeded'),
      allowedCountryCodes: z
        .string()
        .optional()
        .describe('Comma-separated ISO 2-letter country codes to restrict allowed countries')
    })
  )
  .output(
    z.object({
      isVerified: z.boolean().describe('Whether the phone number is verified'),
      lineType: z.string().optional().describe('Phone line type (e.g., "mobile", "landline")'),
      lineStatus: z
        .string()
        .optional()
        .describe('Connection status (e.g., "connected", "disconnected")'),
      countryCode: z.string().optional().describe('ISO country code of the phone number'),
      callingCode: z.string().optional().describe('International calling code'),
      nationalNumber: z.string().optional().describe('Phone number in national format'),
      internationalNumber: z
        .string()
        .optional()
        .describe('Phone number in international format'),
      notVerifiedReason: z
        .string()
        .optional()
        .describe('Reason the phone could not be verified'),
      notVerifiedCode: z
        .string()
        .optional()
        .describe('Error code if phone could not be verified'),
      success: z.boolean().describe('Whether the API request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let data = await client.verifyPhone({
      phoneNumber: ctx.input.phoneNumber,
      defaultCountryCode: ctx.input.defaultCountryCode,
      mobileOnly: ctx.input.mobileOnly,
      timeout: ctx.input.timeout,
      allowedCountryCodes: ctx.input.allowedCountryCodes
    });

    return {
      output: {
        isVerified: data.is_verified ?? false,
        lineType: data.line_type,
        lineStatus: data.line_status,
        countryCode: data.country_code,
        callingCode: data.calling_code,
        nationalNumber: data.national_number,
        internationalNumber: data.international_number,
        notVerifiedReason: data.not_verified_reason,
        notVerifiedCode: data.not_verified_code,
        success: data.success ?? true
      },
      message: data.is_verified
        ? `Phone **${ctx.input.phoneNumber}** is **verified** (${data.line_type || 'unknown type'}, ${data.line_status || 'unknown status'}).`
        : `Phone **${ctx.input.phoneNumber}** could **not** be verified. Reason: ${data.not_verified_reason || 'unknown'}`
    };
  })
  .build();
