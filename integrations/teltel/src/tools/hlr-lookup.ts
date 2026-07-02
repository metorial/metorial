import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let hlrLookupTool = SlateTool.create(spec, {
  name: 'HLR Lookup',
  key: 'hlr_lookup',
  description: `Verify the availability and validity of a phone number using HLR (Home Location Register) lookup. Checks whether the number is active and reachable before initiating communication.
Useful for cleaning contact lists and reducing failed call/SMS attempts.`,
  constraints: ['HLR check rates are approximately 0.005 EUR per lookup.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Phone number to verify (in international format, e.g. "+37061234567")')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('The phone number that was checked'),
      result: z
        .any()
        .describe('HLR lookup result containing availability, network, and status information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let result = await client.hlrLookup(ctx.input.phoneNumber);

    return {
      output: {
        phoneNumber: ctx.input.phoneNumber,
        result
      },
      message: `HLR lookup completed for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
