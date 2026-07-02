import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyPhone = SlateTool.create(spec, {
  name: 'Verify Phone Number',
  key: 'verify_phone',
  description: `Validates a phone number and returns detailed metadata including validity status, phone type (mobile, landline, toll-free, etc.), carrier, country, region, and formatted number variants (international, local, E.164).

Useful for verifying customer phone numbers, enriching contact data with carrier and location information, and ensuring numbers are properly formatted.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe(
          'The phone number to validate. Can include country prefix with leading "+" or be a local number.'
        ),
      defaultCountry: z
        .string()
        .optional()
        .describe(
          'Two-letter ISO country code (e.g., "US", "DE"). Used when the phone number does not include a country prefix. If omitted, the country is inferred from the request IP address.'
        )
    })
  )
  .output(
    z.object({
      phone: z.string().describe('The input phone number as received'),
      phoneValid: z.boolean().describe('Whether the phone number is valid'),
      phoneType: z
        .string()
        .nullable()
        .describe(
          'Type of phone number: mobile, fixed_line, toll_free, premium_rate, shared_cost, voip, personal_number, pager, uan, voicemail, or unknown'
        ),
      phoneRegion: z.string().nullable().describe('Geographic region of the phone number'),
      country: z.string().nullable().describe('Full country name'),
      countryCode: z.string().nullable().describe('Two-letter ISO country code'),
      countryPrefix: z
        .string()
        .nullable()
        .describe('International dialing prefix for the country'),
      internationalNumber: z
        .string()
        .nullable()
        .describe('Phone number formatted in international format with leading "+"'),
      localNumber: z.string().nullable().describe('Phone number formatted in local format'),
      e164: z.string().nullable().describe('Phone number in E.164 standard format'),
      carrier: z.string().nullable().describe('Name of the phone carrier/operator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyPhone({
      phone: ctx.input.phone,
      defaultCountry: ctx.input.defaultCountry
    });

    let message: string;
    if (result.phoneValid) {
      let parts = [
        `**${result.internationalNumber || result.phone}** is a valid ${result.phoneType || 'unknown type'} number`
      ];
      if (result.carrier) parts.push(`on **${result.carrier}**`);
      if (result.country) parts.push(`in **${result.country}**`);
      if (result.phoneRegion) parts.push(`(${result.phoneRegion})`);
      message = parts.join(' ');
    } else {
      message = `**${result.phone}** is not a valid phone number.`;
    }

    return {
      output: {
        phone: result.phone,
        phoneValid: result.phoneValid,
        phoneType: result.phoneType,
        phoneRegion: result.phoneRegion,
        country: result.country,
        countryCode: result.countryCode,
        countryPrefix: result.countryPrefix,
        internationalNumber: result.internationalNumber,
        localNumber: result.localNumber,
        e164: result.e164,
        carrier: result.carrier
      },
      message
    };
  })
  .build();
