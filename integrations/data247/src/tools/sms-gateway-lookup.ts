import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let gatewayResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  carrierName: z.string().optional().describe('Name of the carrier'),
  isWireless: z.string().optional().describe('Whether the number is wireless ("y" or "n")'),
  smsAddress: z
    .string()
    .optional()
    .describe('Email-to-SMS gateway address for sending SMS via email'),
  mmsAddress: z
    .string()
    .optional()
    .describe('Email-to-MMS gateway address for sending MMS via email')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  carrierName: raw.carrier_name,
  isWireless: raw.wless,
  smsAddress: raw.sms_address,
  mmsAddress: raw.mms_address
});

export let smsGatewayLookup = SlateTool.create(spec, {
  name: 'SMS/MMS Gateway Lookup',
  key: 'sms_gateway_lookup',
  description: `Retrieve email-to-SMS and email-to-MMS gateway addresses for wireless phone numbers. These addresses allow sending text messages via regular email without per-message fees. Supports US and Canadian phone numbers.`,
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
        .describe('Phone numbers to look up SMS/MMS gateway addresses for')
    })
  )
  .output(
    z.object({
      results: z
        .array(gatewayResultSchema)
        .describe('Gateway information for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result = await client.smsGatewayLookup(phones[0]!);
      results = [result];
    } else {
      results = await client.smsGatewayLookupBatch(phones);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Retrieved SMS/MMS gateway addresses for **${phones.length}** phone number(s).`
    };
  })
  .build();
