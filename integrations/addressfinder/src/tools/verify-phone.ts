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
        .describe('Comma-separated ISO 2-letter country codes to restrict allowed countries'),
      verifyFormatOnly: z
        .boolean()
        .optional()
        .describe('Check syntax and number range only, without the network connection check.')
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
      rawNational: z
        .string()
        .optional()
        .describe('National phone number without whitespace or punctuation.'),
      rawInternational: z
        .string()
        .optional()
        .describe('International phone number without formatting.'),
      lineStatusReason: z
        .string()
        .optional()
        .describe('Provider explanation of the line status.'),
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
      allowedCountryCodes: ctx.input.allowedCountryCodes,
      verifyFormatOnly: ctx.input.verifyFormatOnly
    });

    return {
      output: {
        isVerified: data.is_verified ?? false,
        lineType: data.line_type ?? undefined,
        lineStatus: data.line_status ?? undefined,
        lineStatusReason: data.line_status_reason ?? undefined,
        countryCode: data.country_code ?? undefined,
        callingCode: data.calling_code ?? undefined,
        nationalNumber: data.formatted_national ?? data.national_number ?? undefined,
        internationalNumber:
          data.formatted_international ?? data.international_number ?? undefined,
        rawNational: data.raw_national ?? undefined,
        rawInternational: data.raw_international ?? undefined,
        notVerifiedReason: data.not_verified_reason ?? undefined,
        notVerifiedCode: data.not_verified_code ?? undefined,
        success: data.success ?? true
      },
      message: data.is_verified
        ? `Phone **${ctx.input.phoneNumber}** is **verified** (${data.line_type || 'unknown type'}, ${data.line_status || 'unknown status'}).`
        : `Phone **${ctx.input.phoneNumber}** could **not** be verified. Reason: ${data.not_verified_reason || 'unknown'}`
    };
  })
  .build();
