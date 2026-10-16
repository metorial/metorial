import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { coverageSchema, creditsSchema, currentCarrierSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  key: 'get_credits',
  name: 'Get Account and Credits',
  description:
    'Identify the account associated with your API key and check its active state, plan, monthly usage, pay-as-you-go balance, and usage by lookup mode. This request does not spend verification credits.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(creditsSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getCredits();
    return {
      output,
      message: `Retrieved the account and credit usage for **${output.email}**.`
    };
  })
  .build();

export let getCurrentCoverage = SlateTool.create(spec, {
  key: 'get_current_coverage',
  name: 'Get Current Carrier Coverage',
  description:
    'List the countries where current carrier lookups are supported. Check this before lookup_current_carrier. Coverage describes availability, not whether an individual lookup will resolve. This request does not spend verification credits.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(coverageSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getCurrentCoverage();
    return { output, message: 'Retrieved current carrier lookup coverage.' };
  })
  .build();

export let lookupCurrentCarrier = SlateTool.create(spec, {
  key: 'lookup_current_carrier',
  name: 'Look Up Current Carrier',
  description:
    'Validate a phone number and look up the carrier and line type currently serving it, including ported numbers. Returns the original assignment alongside current lookup details when available. Costs 10 credits when resolved, or 1 credit when only static validation is available; errors are not charged. Call get_current_coverage to check country coverage. This does not test whether a device is reachable or switched on.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe(
          'Phone number to verify. International format with a leading + is recommended.'
        ),
      defaultCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for a number without an international prefix.')
    })
  )
  .output(currentCarrierSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).lookupCurrentCarrier(ctx.input);
    let message = !output.phone_valid
      ? `**${output.phone}** is not a valid phone number.`
      : output.current_lookup === 'unavailable'
        ? `Validated **${output.phone}**; current carrier resolution is unavailable. Static results are included.`
        : `Retrieved the carrier lookup result for **${output.phone}**.`;
    return { output, message };
  })
  .build();
