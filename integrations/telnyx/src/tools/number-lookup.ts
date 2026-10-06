import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let numberLookup = SlateTool.create(spec, {
  name: 'Number Lookup',
  key: 'number_lookup',
  description: `Look up information about a phone number including carrier details, line type, portability, and caller ID (CNAM). Useful for verifying numbers before sending messages or making calls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Phone number to look up in E.164 format (e.g., +15551234567)'),
      type: z
        .enum(['carrier', 'caller-name'])
        .optional()
        .describe('Type of lookup: "carrier" for carrier info, "caller-name" for CNAM data')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('Phone number looked up'),
      countryCode: z.string().nullish().describe('ISO country code'),
      nationalFormat: z.string().nullish().describe('Number in national format'),
      carrierName: z.string().nullish().describe('Carrier/operator name'),
      carrierType: z
        .string()
        .nullish()
        .describe('Line type (e.g., "mobile", "landline", "voip")'),
      mobileCountryCode: z.string().nullish().describe('Mobile country code (MCC)'),
      mobileNetworkCode: z.string().nullish().describe('Mobile network code (MNC)'),
      callerName: z.string().nullish().describe('CNAM caller name'),
      portabilityLineType: z.string().nullish().describe('Line type from portability data'),
      portedStatus: z.string().nullish().describe('Porting status'),
      city: z.string().nullish().describe('City associated with the number'),
      state: z.string().nullish().describe('State associated with the number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });
    let result = await client.lookupNumber(ctx.input.phoneNumber, ctx.input.type);

    return {
      output: {
        phoneNumber: result.phone_number ?? ctx.input.phoneNumber,
        countryCode: result.country_code,
        nationalFormat: result.national_format,
        carrierName: result.carrier?.name,
        carrierType: result.carrier?.type,
        mobileCountryCode: result.carrier?.mobile_country_code,
        mobileNetworkCode: result.carrier?.mobile_network_code,
        callerName: result.caller_name?.caller_name,
        portabilityLineType: result.portability?.line_type,
        portedStatus: result.portability?.ported_status,
        city: result.portability?.city,
        state: result.portability?.state
      },
      message: `Number **${ctx.input.phoneNumber}**: ${result.carrier?.name ?? 'Unknown carrier'} (${result.carrier?.type ?? 'unknown type'})${result.portability?.city ? `, ${result.portability.city}` : ''}.`
    };
  })
  .build();
