import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeErrorText = (errorText: string | Record<string, never>): string => {
  if (typeof errorText === 'string') return errorText;
  return '';
};

export let scoreFraudRisk = SlateTool.create(spec, {
  name: 'Score Phone Fraud Risk',
  key: 'score_fraud_risk',
  description: `Provides a fraud risk score and detailed data points for a phone number, enabling identification of possible fraud before it occurs. Returns risk level, numeric score, recommendation, phone type, carrier, and geographic location data. Customize your risk tolerance based on the returned score.`,
  constraints: [
    'Phone number must be a valid US or Canadian number.',
    'API rate limit of 10 requests per second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z.string().describe('Phone number to check for fraud risk (digits only)')
    })
  )
  .output(
    z.object({
      riskLevel: z.string().describe('Risk assessment: low, medium, or high'),
      riskScore: z.string().describe('Numeric fraud risk score (0-1000)'),
      recommendation: z.string().describe('Recommended action: allow, flag, or block'),
      phoneType: z.string().describe('Phone type description: Mobile, Landline, VOIP, etc.'),
      carrier: z.string().describe('Phone carrier/service provider'),
      transactionId: z.string().describe('Unique transaction identifier'),
      transactionStatus: z.string().describe('Transaction status description'),
      locationCity: z.string().optional().describe('City associated with the phone number'),
      locationState: z.string().optional().describe('State associated with the phone number'),
      locationZip: z.string().optional().describe('ZIP code associated with the phone number'),
      locationCountry: z.string().optional().describe('Country name'),
      locationLatitude: z.string().optional().describe('Latitude coordinate'),
      locationLongitude: z.string().optional().describe('Longitude coordinate'),
      locationTimeZone: z.string().optional().describe('Time zone'),
      errorText: z
        .string()
        .optional()
        .describe('Error message if the check encountered an issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.fraudCheck(ctx.input.phone);
    let errorText = normalizeErrorText(result.error_text);

    return {
      output: {
        riskLevel: result.risk_level,
        riskScore: result.score,
        recommendation: result.recommendation,
        phoneType: result.phn_desc,
        carrier: result.carrier,
        transactionId: result.id,
        transactionStatus: result.tdesc,
        locationCity: result.location_city || undefined,
        locationState: result.location_state || undefined,
        locationZip: result.location_zip || undefined,
        locationCountry: result.location_country_name || undefined,
        locationLatitude: result.location_latitude || undefined,
        locationLongitude: result.location_longitude || undefined,
        locationTimeZone: result.location_time_zone || undefined,
        errorText: errorText || undefined
      },
      message: `Phone **${ctx.input.phone}**: Risk **${result.risk_level}** (score: ${result.score}), recommendation: **${result.recommendation}**. Type: ${result.phn_desc}, carrier: ${result.carrier}${result.location_city ? `, location: ${result.location_city}, ${result.location_state}` : ''}.`
    };
  })
  .build();
