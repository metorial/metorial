import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let validatePhoneTool = SlateTool.create(spec, {
  name: 'Validate Phone Number',
  key: 'validate_phone',
  description: `Parse and validate a phone number, returning type (mobile, fixed-line, VoIP, etc.), carrier, country, and formatted versions. Accepts both international (E.164) and local formats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      number: z.string().describe('Phone number in international (E.164) or local format'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 2-letter country code, required for local format numbers'),
      ip: z
        .string()
        .optional()
        .describe('User IP address to help infer country for local numbers')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the phone number is valid'),
      type: z
        .string()
        .describe(
          'Number type: mobile, fixed-line, premium-rate, toll-free, voip, or unknown'
        ),
      internationalCallingCode: z.string().describe('International dialing prefix'),
      internationalNumber: z.string().describe('Full E.164 international format'),
      localNumber: z.string().describe('Local dialing format'),
      location: z.string().describe('Location associated with the number'),
      country: z.string().describe('Country name'),
      countryCode: z.string().describe('ISO 2-letter country code'),
      countryCode3: z.string().describe('ISO 3-letter country code'),
      currencyCode: z.string().describe('ISO 4217 currency code'),
      isMobile: z.boolean().describe('Whether this is a mobile number'),
      prefixNetwork: z.string().describe('Network/carrier owning the prefix')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.phoneValidate({
      number: ctx.input.number,
      countryCode: ctx.input.countryCode,
      ip: ctx.input.ip
    });

    return {
      output: {
        valid: result.valid,
        type: result.type ?? 'unknown',
        internationalCallingCode: result.internationalCallingCode ?? '',
        internationalNumber: result.internationalNumber ?? '',
        localNumber: result.localNumber ?? '',
        location: result.location ?? '',
        country: result.country ?? '',
        countryCode: result.countryCode ?? '',
        countryCode3: result.countryCode3 ?? '',
        currencyCode: result.currencyCode ?? '',
        isMobile: result.isMobile ?? false,
        prefixNetwork: result.prefixNetwork ?? ''
      },
      message: result.valid
        ? `**${result.internationalNumber}** is a valid ${result.type} number in ${result.country}.${result.prefixNetwork ? ` Carrier: ${result.prefixNetwork}.` : ''}`
        : `**${ctx.input.number}** is not a valid phone number.`
    };
  })
  .build();
