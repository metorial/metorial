import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validatePhoneNumberTool = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone_number',
  description: `Validate and format an international phone number using the E.164 numbering plan. Returns whether the number is valid, its formatted representations (E.164, international, national), detected line type, estimated location, and country information.`,
  instructions: [
    'Provide the country code (ISO 3166-1 Alpha-2, Alpha-3, or numeric) for best results. If omitted, the API will attempt to detect the country.',
    'Line types include FIXED_LINE, MOBILE, TOLL_FREE, PREMIUM_RATE, VOIP, PAGER, and others.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number to validate (any common format)'),
      countryCode: z
        .string()
        .optional()
        .describe(
          'Country code in ISO 3166-1 Alpha-2, Alpha-3, or numeric format (e.g. "US", "USA", "840")'
        )
    })
  )
  .output(
    z
      .object({
        isValid: z.boolean().describe('Whether the phone number is valid'),
        e164Format: z
          .string()
          .optional()
          .describe('Number in E.164 format (e.g. +14156665555)'),
        internationalFormat: z
          .string()
          .optional()
          .describe('Number in international dial format'),
        nationalFormat: z.string().optional().describe('Number in local/national dial format'),
        lineType: z
          .string()
          .optional()
          .describe('Detected line type (FIXED_LINE, MOBILE, VOIP, etc.)'),
        location: z.string().optional().describe('Estimated location of the phone number'),
        country: z
          .object({
            isoAlpha2: z.string().optional().describe('ISO 3166-1 Alpha-2 country code'),
            isoAlpha3: z.string().optional().describe('ISO 3166-1 Alpha-3 country code'),
            m49Code: z.number().optional().describe('United Nations M.49 code'),
            name: z.string().optional().describe('Localised country name')
          })
          .passthrough()
          .optional()
          .describe('Country information for the phone number')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.phoneNumberValidate({
      number: ctx.input.phoneNumber,
      countryCode: ctx.input.countryCode
    });

    let valid = result.isValid ? 'valid' : 'invalid';
    let formatted = result.e164Format || ctx.input.phoneNumber;
    let lineType = result.lineType || 'unknown';

    return {
      output: result,
      message: `Phone number **${formatted}** is **${valid}**. Line type: ${lineType}.`
    };
  })
  .build();
