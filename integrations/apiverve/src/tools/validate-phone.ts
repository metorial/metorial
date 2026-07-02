import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validatePhone = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone',
  description: `Validate a phone number and get formatted versions in international, national, RFC, and E.164 formats. Returns whether the number is valid, its type (mobile, fixed line, etc.), and country information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('The phone number to validate (e.g. "816-555-1017")'),
      country: z.string().describe('Two-letter country code (e.g. "us", "gb", "de")')
    })
  )
  .output(
    z.object({
      isValid: z.boolean().describe('Whether the phone number is valid'),
      isMobile: z.boolean().describe('Whether the number is a mobile number'),
      numberType: z
        .string()
        .describe('Type of phone number (e.g. mobile, fixed_line, fixed_line_or_mobile)'),
      country: z.string().describe('Detected country code'),
      countryName: z.string().describe('Full name of the detected country'),
      countryCallingCode: z.number().describe('International calling code'),
      formattedInternational: z.string().describe('Number in international format'),
      formattedNational: z.string().describe('Number in national format'),
      formattedE164: z.string().describe('Number in E.164 format'),
      formattedRfc: z.string().describe('Number in RFC format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.validatePhoneNumber(ctx.input.phoneNumber, ctx.input.country);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Phone validation failed');
    }

    let data = result.data;
    let output = {
      isValid: data.isvalid,
      isMobile: data.isMobile,
      numberType: data.type,
      country: data.detectedCountry,
      countryName: data.countryName,
      countryCallingCode: data.countrycode,
      formattedInternational: data.formatted?.international ?? '',
      formattedNational: data.formatted?.national ?? '',
      formattedE164: data.formatted?.e164 ?? '',
      formattedRfc: data.formatted?.rfc ?? ''
    };

    let status = data.isvalid ? '**valid**' : '**invalid**';

    return {
      output,
      message: `Phone number \`${ctx.input.phoneNumber}\` is ${status}. ${data.isvalid ? `Formatted: ${data.formatted?.international ?? ctx.input.phoneNumber}` : ''}`
    };
  })
  .build();
