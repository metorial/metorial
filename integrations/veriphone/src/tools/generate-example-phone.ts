import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateExamplePhone = SlateTool.create(spec, {
  name: 'Generate Example Phone Number',
  key: 'generate_example_phone',
  description: `Generates a dummy phone number for a given country and phone type combination. Returns the number in multiple formats (international, local, E.164).

Useful for testing, development, and generating placeholder phone numbers for specific countries and line types.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z
        .string()
        .optional()
        .describe(
          'Two-letter ISO country code (e.g., "US", "DE", "GB"). If omitted, a country is inferred from the request IP address.'
        ),
      phoneType: z
        .string()
        .optional()
        .describe(
          'Type of phone number to generate: "mobile", "fixed_line", "toll_free", "premium_rate", "shared_cost", "voip", "personal_number", "pager", "uan", or "voicemail". Defaults to "mobile" if omitted.'
        )
    })
  )
  .output(
    z.object({
      phoneType: z.string().describe('The type of the generated phone number'),
      countryCode: z.string().describe('Two-letter ISO country code of the generated number'),
      countryPrefix: z.string().describe('International dialing prefix for the country'),
      internationalNumber: z
        .string()
        .describe('Phone number formatted in international format with leading "+"'),
      localNumber: z.string().describe('Phone number formatted in local format'),
      e164: z.string().describe('Phone number in E.164 standard format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getExamplePhone({
      countryCode: ctx.input.countryCode,
      phoneType: ctx.input.phoneType
    });

    let message = `Generated ${result.phoneType} example number for **${result.countryCode}**: **${result.internationalNumber}** (E.164: ${result.e164})`;

    return {
      output: {
        phoneType: result.phoneType,
        countryCode: result.countryCode,
        countryPrefix: result.countryPrefix,
        internationalNumber: result.internationalNumber,
        localNumber: result.localNumber,
        e164: result.e164
      },
      message
    };
  })
  .build();
