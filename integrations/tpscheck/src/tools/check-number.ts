import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineSchema = z.object({
  type: z.string().describe('Line type (e.g. landline, mobile, voip)'),
  originalCarrier: z.string().describe('Original network carrier'),
  location: z.string().describe('Geographic location (landlines only)'),
  country: z.string().describe('Country of the phone number'),
  prefix: z.string().describe('Area code prefix')
});

let reachabilitySchema = z.object({
  status: z.string().describe('Reachability status (e.g. reachable, unknown)'),
  confidence: z.string().describe('Confidence level (e.g. high, medium, low)')
});

export let checkNumber = SlateTool.create(spec, {
  name: 'Check Phone Number',
  key: 'check_number',
  description: `Verify a UK phone number against the TPS and CTPS registers and retrieve phone intelligence data.
Returns the TPS/CTPS registration status along with enriched line details including type, carrier, location, reachability, and compliance risk score.
Uses **1 credit** per check.`,
  constraints: [
    'Only UK phone numbers are supported.',
    'Uses 1 credit per check.',
    'Risk scoring requires a Business or Enterprise plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('The UK phone number to check (e.g. "01829 830730" or "+441829830730")')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('The original phone number submitted'),
      e164: z.string().describe('Phone number in E.164 international format'),
      valid: z.boolean().describe('Whether the phone number is valid'),
      tpsRegistered: z.boolean().describe('Whether the number is registered on the TPS'),
      ctpsRegistered: z.boolean().describe('Whether the number is registered on the CTPS'),
      line: lineSchema.describe('Line details including type, carrier, and location'),
      reachability: reachabilitySchema.describe('Reachability status and confidence'),
      riskScore: z
        .number()
        .optional()
        .describe('Compliance risk score from 0-100 (Business/Enterprise plans only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkNumber(ctx.input.phoneNumber);

    let tpsLabel = result.tps ? '**registered**' : 'not registered';
    let ctpsLabel = result.ctps ? '**registered**' : 'not registered';
    let riskInfo = result.risk !== undefined ? ` Risk score: **${result.risk}/100**.` : '';

    return {
      output: {
        phoneNumber: result.input,
        e164: result.e164,
        valid: result.valid,
        tpsRegistered: result.tps,
        ctpsRegistered: result.ctps,
        line: {
          type: result.line.type,
          originalCarrier: result.line.original_carrier,
          location: result.line.location,
          country: result.line.country,
          prefix: result.line.prefix
        },
        reachability: {
          status: result.reachability.status,
          confidence: result.reachability.confidence
        },
        riskScore: result.risk
      },
      message: `Checked **${result.e164}** (${result.line.type}): TPS ${tpsLabel}, CTPS ${ctpsLabel}.${riskInfo}`
    };
  })
  .build();
