import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let checkResultSchema = z.object({
  phoneNumber: z.string().describe('The original phone number submitted'),
  e164: z.string().describe('Phone number in E.164 international format'),
  valid: z.boolean().describe('Whether the phone number is valid'),
  tpsRegistered: z.boolean().describe('Whether the number is registered on the TPS'),
  ctpsRegistered: z.boolean().describe('Whether the number is registered on the CTPS'),
  lineType: z.string().describe('Line type (e.g. landline, mobile, voip)'),
  originalCarrier: z.string().describe('Original network carrier'),
  location: z.string().describe('Geographic location (landlines only)'),
  country: z.string().describe('Country of the phone number'),
  reachabilityStatus: z.string().describe('Reachability status (e.g. reachable, unknown)'),
  reachabilityConfidence: z.string().describe('Confidence level (e.g. high, medium, low)'),
  riskScore: z
    .number()
    .optional()
    .describe('Compliance risk score from 0-100 (Business/Enterprise plans only)')
});

export let batchCheck = SlateTool.create(spec, {
  name: 'Batch Check Phone Numbers',
  key: 'batch_check',
  description: `Verify multiple UK phone numbers against TPS and CTPS registers in a single request.
Returns TPS/CTPS registration status and phone intelligence for each number.
Uses **1 credit per number** checked.`,
  constraints: [
    'Maximum 100 phone numbers per request.',
    'Uses 1 credit per number.',
    'Requires an Advanced or Unlimited plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumbers: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of UK phone numbers to check (max 100)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of results returned'),
      results: z.array(checkResultSchema).describe('Check results for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.batchCheck(ctx.input.phoneNumbers);

    let results = response.results.map(r => ({
      phoneNumber: r.input,
      e164: r.e164,
      valid: r.valid,
      tpsRegistered: r.tps,
      ctpsRegistered: r.ctps,
      lineType: r.line.type,
      originalCarrier: r.line.original_carrier,
      location: r.line.location,
      country: r.line.country,
      reachabilityStatus: r.reachability.status,
      reachabilityConfidence: r.reachability.confidence,
      riskScore: r.risk
    }));

    let tpsCount = results.filter(r => r.tpsRegistered).length;
    let ctpsCount = results.filter(r => r.ctpsRegistered).length;

    return {
      output: {
        total: response.total,
        results
      },
      message: `Checked **${response.total}** numbers: **${tpsCount}** on TPS, **${ctpsCount}** on CTPS.`
    };
  })
  .build();
