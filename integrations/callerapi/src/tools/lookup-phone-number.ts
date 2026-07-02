import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let carrierCountrySchema = z
  .object({
    code: z.string().optional().describe('Country calling code'),
    iso: z.string().optional().describe('ISO country code'),
    name: z.string().optional().describe('Country name')
  })
  .optional();

let carrierNetworkSchema = z
  .object({
    carrier: z.string().optional().describe('Current carrier name'),
    ocn: z.string().optional().describe('Operating company number'),
    original: z
      .object({
        carrier: z.string().optional().describe('Original carrier name'),
        spid: z.string().optional().describe('Original service provider ID')
      })
      .optional()
      .describe('Original carrier information'),
    spid: z.string().optional().describe('Service provider ID'),
    type: z.string().optional().describe('Network type (e.g., IPES, WIRELESS)')
  })
  .optional();

let carrierNumberSchema = z
  .object({
    landline: z.boolean().optional().describe('Whether the number is a landline'),
    localFormat: z.string().optional().describe('Local format of the number'),
    lrn: z.string().optional().describe('Local routing number'),
    mobile: z.boolean().optional().describe('Whether the number is mobile'),
    msisdn: z.string().optional().describe('MSISDN format of the number'),
    ported: z.boolean().optional().describe('Whether the number has been ported'),
    portedDate: z.string().optional().describe('Date the number was ported'),
    timezone: z.string().optional().describe('Timezone of the number'),
    type: z.string().optional().describe('Number type'),
    valid: z.string().optional().describe('Whether the number is valid')
  })
  .optional();

export let lookupPhoneNumber = SlateTool.create(spec, {
  name: 'Lookup Phone Number',
  key: 'lookup_phone_number',
  description: `Retrieve comprehensive intelligence about a phone number including carrier info, spam reputation, complaint history, and porting status. Aggregates data from multiple sources. Optionally includes HLR (Home Location Register) data for real-time network validation.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +16502530000)',
    'Enabling HLR adds 1-3 seconds to response time but provides real-time carrier validation at no additional cost'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)'),
      includeHlr: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include HLR data for real-time carrier validation')
    })
  )
  .output(
    z.object({
      carrierCountry: carrierCountrySchema.describe('Country information for the carrier'),
      carrierNetwork: carrierNetworkSchema.describe('Network and carrier information'),
      carrierNumber: carrierNumberSchema.describe('Phone number details'),
      isSpam: z.boolean().optional().describe('Whether the number is flagged as spam'),
      spamScore: z.number().optional().describe('Spam score from 0-100'),
      totalComplaints: z.number().optional().describe('Total number of complaints filed'),
      rawResponse: z.any().optional().describe('Full raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.lookupPhoneNumber(ctx.input.phoneNumber, ctx.input.includeHlr);

    let data = result.data || result;

    let carrierInfo = data.carrier_info || {};
    let country = carrierInfo.country || {};
    let network = carrierInfo.network || {};
    let number = carrierInfo.number || {};

    return {
      output: {
        carrierCountry: country
          ? {
              code: country.code,
              iso: country.iso,
              name: country.name
            }
          : undefined,
        carrierNetwork: network
          ? {
              carrier: network.carrier,
              ocn: network.ocn,
              original: network.original
                ? {
                    carrier: network.original.carrier,
                    spid: network.original.spid
                  }
                : undefined,
              spid: network.spid,
              type: network.type
            }
          : undefined,
        carrierNumber: number
          ? {
              landline: number.landline,
              localFormat: number.local_format,
              lrn: number.lrn,
              mobile: number.mobile,
              msisdn: number.msisdn,
              ported: number.ported,
              portedDate: number.ported_date,
              timezone: number.timezone,
              type: number.type,
              valid: number.valid
            }
          : undefined,
        isSpam: data.is_spam,
        spamScore: data.spam_score,
        totalComplaints: data.total_complaints,
        rawResponse: result
      },
      message: `Looked up phone number **${ctx.input.phoneNumber}**. Spam score: **${data.spam_score ?? 'N/A'}**, Carrier: **${network.carrier ?? 'Unknown'}**, Ported: **${number.ported ?? 'Unknown'}**.`
    };
  })
  .build();
