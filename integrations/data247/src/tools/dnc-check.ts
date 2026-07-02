import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dncResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  dnc: z.string().optional().describe('Do-Not-Call status'),
  federalDnc: z
    .string()
    .optional()
    .describe('Whether the number is on the Federal Do-Not-Call list'),
  internalDnc: z
    .string()
    .optional()
    .describe('Whether the number is on your internal Do-Not-Call list')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  dnc: raw.dnc,
  federalDnc: raw.federal_dnc || raw.fed_dnc,
  internalDnc: raw.internal_dnc || raw.int_dnc
});

export let dncCheck = SlateTool.create(spec, {
  name: 'Do-Not-Call Check',
  key: 'dnc_check',
  description: `Check whether phone numbers are on the Federal Do-Not-Call (DNC) list or your company's internal DNC list. Helps ensure compliance with Federal Do-Not-Call laws before making outbound calls.`,
  instructions: [
    'To use Federal DNC checking, you must register with the FTC National Do-Not-Call Registry and provide your Organization ID and SAN.'
  ],
  constraints: ['Currently available for USA phone numbers only.'],
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
        .describe('Phone numbers to check against Do-Not-Call lists'),
      organizationId: z
        .string()
        .optional()
        .describe('Your FTC Organization ID (required for Federal DNC checks)'),
      subscriptionAccountNumber: z
        .string()
        .optional()
        .describe(
          'Your FTC Subscription Account Number / SAN (required for Federal DNC checks)'
        )
    })
  )
  .output(
    z.object({
      results: z.array(dncResultSchema).describe('Do-Not-Call status for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones, organizationId, subscriptionAccountNumber } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result = await client.dncCheck(
        phones[0]!,
        organizationId,
        subscriptionAccountNumber
      );
      results = [result];
    } else {
      results = await client.dncCheckBatch(phones, organizationId, subscriptionAccountNumber);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Checked **${phones.length}** phone number(s) against Do-Not-Call lists.`
    };
  })
  .build();
