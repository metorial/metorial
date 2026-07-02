import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let searchPhoneNumbers = SlateTool.create(spec, {
  name: 'Search Available Phone Numbers',
  key: 'search_phone_numbers',
  description: `Search for phone numbers available for purchase. Filter by country, type (local, toll-free), city, state, features, and number patterns. Use this to find numbers before ordering them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z
        .string()
        .describe('ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA")'),
      phoneNumberType: z
        .enum(['local', 'toll_free', 'national', 'mobile'])
        .optional()
        .describe('Type of phone number'),
      features: z
        .array(z.enum(['sms', 'mms', 'voice', 'fax', 'emergency']))
        .optional()
        .describe('Required features for the phone number'),
      city: z.string().optional().describe('City name to filter by'),
      state: z.string().optional().describe('State/province code to filter by'),
      startsWith: z.string().optional().describe('Number must start with this pattern'),
      endsWith: z.string().optional().describe('Number must end with this pattern'),
      contains: z.string().optional().describe('Number must contain this pattern'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(
          z.object({
            phoneNumber: z.string().describe('The phone number in E.164 format'),
            phoneNumberType: z.string().optional().describe('Type of phone number'),
            region: z.string().optional().describe('Region/state of the number'),
            locality: z.string().optional().describe('City/locality of the number'),
            features: z.array(z.string()).optional().describe('Supported features'),
            costCurrency: z.string().optional().describe('Cost currency'),
            costAmount: z.string().optional().describe('Monthly cost'),
            reservable: z.boolean().optional().describe('Whether the number can be reserved')
          })
        )
        .describe('List of available phone numbers'),
      totalResults: z.number().optional().describe('Total number of results available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.searchAvailablePhoneNumbers({
      countryCode: ctx.input.countryCode,
      phoneNumberType: ctx.input.phoneNumberType,
      features: ctx.input.features,
      city: ctx.input.city,
      state: ctx.input.state,
      startsWith: ctx.input.startsWith,
      endsWith: ctx.input.endsWith,
      contains: ctx.input.contains,
      limit: ctx.input.limit
    });

    let phoneNumbers = (result.data ?? []).map((pn: any) => ({
      phoneNumber: pn.phone_number,
      phoneNumberType: pn.phone_number_type,
      region: pn.region_information?.[0]?.region_name,
      locality:
        pn.region_information?.[0]?.region_type === 'city'
          ? pn.region_information?.[0]?.region_name
          : undefined,
      features: pn.features,
      costCurrency: pn.cost_information?.currency,
      costAmount: pn.cost_information?.monthly_cost,
      reservable: pn.reservable
    }));

    return {
      output: {
        phoneNumbers,
        totalResults: result.meta?.total_results
      },
      message: `Found **${phoneNumbers.length}** available phone numbers in ${ctx.input.countryCode}${ctx.input.city ? `, ${ctx.input.city}` : ''}.`
    };
  })
  .build();
