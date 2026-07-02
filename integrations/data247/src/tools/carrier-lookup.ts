import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let carrierResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  carrierName: z.string().optional().describe('Name of the carrier'),
  carrierId: z.string().optional().describe('Carrier ID'),
  isWireless: z.string().optional().describe('Whether the number is wireless ("y" or "n")'),
  smsAddress: z.string().optional().describe('Email-to-SMS gateway address'),
  mmsAddress: z.string().optional().describe('Email-to-MMS gateway address'),
  type: z
    .string()
    .optional()
    .describe('Phone type: "M" for mobile, "L" for landline, "V" for VOIP'),
  country: z.string().optional().describe('Country name (international lookups)'),
  timezone: z.string().optional().describe('Timezone for the phone number area')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  carrierName: raw.carrier_name,
  carrierId: raw.carrier_id,
  isWireless: raw.wless,
  smsAddress: raw.sms_address,
  mmsAddress: raw.mms_address,
  type: raw.type,
  country: raw.country,
  timezone: raw.timezone
});

export let carrierLookup = SlateTool.create(spec, {
  name: 'Carrier Lookup',
  key: 'carrier_lookup',
  description: `Look up carrier information for phone numbers. Supports **USA**, **international**, and **carrier type only** lookups. Returns carrier name, wireless status, SMS/MMS gateway addresses, and phone type. Use this to identify which carrier owns a phone number and whether it is wireless or landline.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phones: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Phone numbers to look up. Include country code for international numbers.'),
      lookupType: z
        .enum(['usa', 'international', 'carrier_type'])
        .default('usa')
        .describe(
          'Type of lookup: "usa" for US numbers with full details, "international" for worldwide numbers, "carrier_type" for USA/Canada carrier type only'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(carrierResultSchema)
        .describe('Carrier information for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones, lookupType } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result: Record<string, string>;
      if (lookupType === 'international') {
        result = await client.carrierLookupInternational(phones[0]!);
      } else if (lookupType === 'carrier_type') {
        result = await client.carrierTypeLookup(phones[0]!);
      } else {
        result = await client.carrierLookupUSA(phones[0]!);
      }
      results = [result];
    } else if (lookupType === 'international') {
      results = await client.carrierLookupInternationalBatch(phones);
    } else if (lookupType === 'carrier_type') {
      results = await client.carrierTypeLookupBatch(phones);
    } else {
      results = await client.carrierLookupUSABatch(phones);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Looked up carrier information for **${phones.length}** phone number(s) using **${lookupType}** lookup.`
    };
  })
  .build();
