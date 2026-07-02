import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

let availableNumberSchema = z.object({
  phoneNumber: z.string().describe('Phone number in E.164 format'),
  friendlyName: z.string().describe('Human-readable formatted phone number'),
  locality: z.string().nullable().describe('City or locality'),
  region: z.string().nullable().describe('State or region'),
  postalCode: z.string().nullable().describe('Postal code'),
  isoCountry: z.string().describe('ISO country code'),
  addressRequirements: z.string().describe('Address requirements (none, any, local, foreign)'),
  capabilities: z
    .object({
      voice: z.boolean().describe('Voice capable'),
      sms: z.boolean().describe('SMS capable'),
      mms: z.boolean().describe('MMS capable')
    })
    .describe('Number capabilities'),
  beta: z.boolean().describe('Whether this is a beta number')
});

export let searchPhoneNumbers = SlateTool.create(spec, {
  name: 'Search Phone Numbers',
  key: 'search_phone_numbers',
  description: `Search for available phone numbers to purchase on Twilio. Filter by country, number type (local, toll-free, mobile), area code, capabilities, and more. Returns a list of numbers that can be purchased using the **Purchase Phone Number** tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z
        .string()
        .describe('ISO 3166-1 alpha-2 country code (e.g. "US", "GB", "CA").'),
      numberType: z
        .enum(['Local', 'TollFree', 'Mobile'])
        .default('Local')
        .describe('Type of phone number to search for.'),
      areaCode: z.string().optional().describe('Filter by area code (e.g. "415").'),
      contains: z
        .string()
        .optional()
        .describe(
          'Pattern to match in the number (e.g. "555" or "AWESOME"). Use * for wildcards.'
        ),
      inRegion: z
        .string()
        .optional()
        .describe('Filter by state/region (e.g. "CA" for California).'),
      inPostalCode: z.string().optional().describe('Filter by postal code.'),
      smsEnabled: z.boolean().optional().describe('Only return SMS-capable numbers.'),
      voiceEnabled: z.boolean().optional().describe('Only return voice-capable numbers.'),
      mmsEnabled: z.boolean().optional().describe('Only return MMS-capable numbers.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results to return (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      availableNumbers: z
        .array(availableNumberSchema)
        .describe('List of available phone numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.searchAvailablePhoneNumbers(
      ctx.input.countryCode,
      ctx.input.numberType,
      {
        areaCode: ctx.input.areaCode,
        contains: ctx.input.contains,
        inRegion: ctx.input.inRegion,
        inPostalCode: ctx.input.inPostalCode,
        smsEnabled: ctx.input.smsEnabled,
        voiceEnabled: ctx.input.voiceEnabled,
        mmsEnabled: ctx.input.mmsEnabled,
        pageSize: ctx.input.pageSize
      }
    );

    let numbers = (result.available_phone_numbers || []).map((n: any) => ({
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      locality: n.locality || null,
      region: n.region || null,
      postalCode: n.postal_code || null,
      isoCountry: n.iso_country,
      addressRequirements: n.address_requirements,
      capabilities: {
        voice: n.capabilities?.voice ?? false,
        sms: n.capabilities?.SMS ?? n.capabilities?.sms ?? false,
        mms: n.capabilities?.MMS ?? n.capabilities?.mms ?? false
      },
      beta: n.beta ?? false
    }));

    return {
      output: { availableNumbers: numbers },
      message: `Found **${numbers.length}** available ${ctx.input.numberType.toLowerCase()} number(s) in **${ctx.input.countryCode}**.`
    };
  })
  .build();
