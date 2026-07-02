import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

export let lookupPhoneNumber = SlateTool.create(spec, {
  name: 'Lookup Phone Number',
  key: 'lookup_phone_number',
  description: `Look up intelligence about a phone number using the Twilio Lookup API. Returns validation, formatting, and optionally carrier/line type, caller name, SIM swap status, and more. The basic lookup (validation + formatting) is free; additional data packages are paid.`,
  instructions: [
    'By default only basic validation and formatting are returned. Use "fields" to request additional data.',
    'For identity_match, also provide firstName, lastName, and/or addressLine1.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe(
          'Phone number to look up in E.164 format (e.g. +15551234567) or national format.'
        ),
      fields: z
        .array(
          z.enum([
            'validation',
            'line_type_intelligence',
            'caller_name',
            'sim_swap',
            'call_forwarding',
            'line_status',
            'identity_match',
            'reassigned_number',
            'sms_pumping_risk',
            'phone_number_quality_score'
          ])
        )
        .optional()
        .describe('Additional data fields to request (paid features).'),
      countryCode: z
        .string()
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code, used when the phone number is in national format.'
        ),
      firstName: z.string().optional().describe('First name for identity_match lookups.'),
      lastName: z.string().optional().describe('Last name for identity_match lookups.'),
      addressLine1: z
        .string()
        .optional()
        .describe('Street address for identity_match lookups.')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format'),
      nationalFormat: z.string().nullable().describe('Phone number in national format'),
      countryCode: z.string().nullable().describe('ISO country code'),
      callingCountryCode: z
        .string()
        .nullable()
        .describe('Calling country code (e.g. "1" for US)'),
      valid: z.boolean().describe('Whether the phone number is valid'),
      validationErrors: z
        .array(z.string())
        .nullable()
        .describe('Validation error codes if invalid'),
      lineTypeIntelligence: z
        .any()
        .nullable()
        .describe('Line type, carrier name, and network codes (if requested)'),
      callerName: z.any().nullable().describe('Caller name information (if requested)'),
      simSwap: z.any().nullable().describe('SIM swap detection result (if requested)'),
      callForwarding: z.any().nullable().describe('Call forwarding status (if requested)'),
      lineStatus: z.any().nullable().describe('Line reachability status (if requested)'),
      identityMatch: z.any().nullable().describe('Identity match result (if requested)'),
      reassignedNumber: z
        .any()
        .nullable()
        .describe('Reassigned number detection (if requested)'),
      smsPumpingRisk: z.any().nullable().describe('SMS pumping risk score (if requested)'),
      phoneNumberQualityScore: z
        .any()
        .nullable()
        .describe('Phone number quality score (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.lookupPhoneNumber(ctx.input.phoneNumber, {
      fields: ctx.input.fields,
      countryCode: ctx.input.countryCode,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      addressLine1: ctx.input.addressLine1
    });

    return {
      output: {
        phoneNumber: result.phone_number,
        nationalFormat: result.national_format,
        countryCode: result.country_code,
        callingCountryCode: result.calling_country_code,
        valid: result.valid,
        validationErrors: result.validation_errors,
        lineTypeIntelligence: result.line_type_intelligence,
        callerName: result.caller_name,
        simSwap: result.sim_swap,
        callForwarding: result.call_forwarding,
        lineStatus: result.line_status,
        identityMatch: result.identity_match,
        reassignedNumber: result.reassigned_number,
        smsPumpingRisk: result.sms_pumping_risk,
        phoneNumberQualityScore: result.phone_number_quality_score
      },
      message: `Looked up **${result.phone_number}** — valid: **${result.valid}**, country: **${result.country_code}**.${result.line_type_intelligence ? ` Line type: **${result.line_type_intelligence.type}**, carrier: **${result.line_type_intelligence.carrier_name}**.` : ''}`
    };
  })
  .build();
