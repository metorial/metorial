import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let phoneResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  active: z.string().optional().describe('Whether the phone number is active'),
  confidence: z.string().optional().describe('Confidence level of the verification')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  active: raw.active,
  confidence: raw.confidence
});

export let verifyPhone = SlateTool.create(spec, {
  name: 'Verify Phone Number',
  key: 'verify_phone',
  description: `Verify whether phone numbers are active and get a confidence level for each. Useful for cleaning phone lists and ensuring numbers are reachable.`,
  instructions: ['This service is not available for USA/Canada phone numbers.'],
  constraints: ['Not available for USA and Canadian phone numbers.'],
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
        .describe('International phone numbers to verify (include country code)')
    })
  )
  .output(
    z.object({
      results: z
        .array(phoneResultSchema)
        .describe('Verification results for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result = await client.verifyPhone(phones[0]!);
      results = [result];
    } else {
      results = await client.verifyPhoneBatch(phones);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Verified **${phones.length}** phone number(s).`
    };
  })
  .build();
