import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validatePhone = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone',
  description: `Validate and format a phone number. Accepts numbers in various formats and normalizes them to E.164 format. Returns validation status, number type (mobile, landline, VoIP, etc.), geographic location, area code, and formatted versions of the number.

Supports phone numbers from 242 countries and territories.`,
  instructions: [
    'Provide the phone number in any format — E.164, national, or international.',
    'If the number lacks an international dialing code prefix (+), provide the address parameter with a country code, country name, or city name.'
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
          'Phone number to validate, in any format (e.g., "+12128675309", "212-867-5309")'
        ),
      address: z
        .string()
        .optional()
        .describe(
          'ISO country code, country name, or city name to help parse numbers without an international dialing code. Required if the number lacks a "+" prefix.'
        )
    })
  )
  .output(
    z.object({
      isValid: z
        .boolean()
        .describe('Whether the number is valid per regional numbering rules'),
      isPossible: z
        .boolean()
        .describe('Whether the number has a theoretically valid structure'),
      numberType: z
        .string()
        .describe(
          'Type of phone number: MOBILE, FIXED_LINE, FIXED_LINE_OR_MOBILE, VOIP, TOLL_FREE, PREMIUM_RATE, etc.'
        ),
      e164: z.string().describe('Phone number in standardized E.164 format'),
      national: z.string().describe('Phone number formatted in national format'),
      international: z.string().describe('Phone number formatted in international format'),
      regionCode: z.string().describe('ISO 3166-1 alpha-2 region code'),
      countryCode: z.number().describe('International dialing code'),
      countryName: z.string().describe('Full country name'),
      areaCode: z.string().describe('Area code portion of the number'),
      location: z.string().describe('Geographic location name (city/region)'),
      isGeographical: z
        .boolean()
        .describe('Whether the number is tied to a geographic location'),
      nationalSignificantNumber: z.string().describe('National number without country code'),
      rawInput: z.string().describe('Original input as submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.validatePhoneNumber({
      number: ctx.input.phoneNumber,
      address: ctx.input.address
    });

    let validityLabel = result.isValid ? 'valid' : 'invalid';

    return {
      output: {
        isValid: result.isValid,
        isPossible: result.isPossible,
        numberType: result.numberType,
        e164: result.e164,
        national: result.national,
        international: result.international,
        regionCode: result.regionCode,
        countryCode: result.countryCode,
        countryName: result.country,
        areaCode: result.areaCode,
        location: result.location,
        isGeographical: result.isGeographical,
        nationalSignificantNumber: result.nationalSignificantNumber,
        rawInput: result.rawInput
      },
      message: `Phone number **${result.international}** is **${validityLabel}** (${result.numberType}). Location: ${result.location || result.country}.`
    };
  })
  .build();
