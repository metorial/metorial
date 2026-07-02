import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

let carrierSchema = z
  .object({
    country: z.string().optional().describe('Country code (e.g., "MY")'),
    name: z.string().optional().describe('Operator name'),
    networkCode: z.number().optional().describe('Combined network code'),
    mcc: z.string().optional().describe('Mobile Country Code'),
    mnc: z.string().optional().describe('Mobile Network Code')
  })
  .optional();

export let numberLookup = SlateTool.create(spec, {
  name: 'Number Lookup',
  key: 'number_lookup',
  description: `Query a mobile phone number to retrieve carrier information, porting status, and network details. Returns the current and original network operator, country, MCC/MNC codes, and whether the number has been ported.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Phone number with country code to look up (e.g., "60123456789")')
    })
  )
  .output(
    z.object({
      status: z.number().describe('API response status code (0 = success)'),
      messageId: z.string().optional().describe('Lookup request identifier'),
      phoneNumber: z.string().optional().describe('The queried phone number'),
      ported: z.string().optional().describe('Porting status: "ported" or "not_ported"'),
      currentCarrier: carrierSchema.describe('Current network operator information'),
      originalCarrier: carrierSchema.describe('Original network operator information'),
      errorMessage: z.string().optional().describe('Error description if lookup failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.numberLookup({
      to: ctx.input.phoneNumber
    });

    let mapCarrier = (carrier: any) => {
      if (!carrier) return undefined;
      return {
        country: carrier.country,
        name: carrier.name,
        networkCode: carrier.network_code,
        mcc: carrier.mcc,
        mnc: carrier.mnc
      };
    };

    return {
      output: {
        status: result.status,
        messageId: result.msgid,
        phoneNumber: result.to,
        ported: result.ported,
        currentCarrier: mapCarrier(result.current_carrier),
        originalCarrier: mapCarrier(result.original_carrier),
        errorMessage: result.err_msg
      },
      message:
        result.status === 0
          ? `Number **${ctx.input.phoneNumber}**: Current carrier **${result.current_carrier?.name || 'Unknown'}** (${result.current_carrier?.country || 'Unknown'}), ported: **${result.ported || 'unknown'}**`
          : `Number lookup failed: ${result.err_msg}`
    };
  })
  .build();
