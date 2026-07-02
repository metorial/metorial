import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let parseAddress = SlateTool.create(spec, {
  name: 'Parse Address',
  key: 'parse_address',
  description: `Parse a US or global address string into its individual component parts (street, city, state, zip, etc.) for structured data handling and storage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z
        .string()
        .describe(
          'The full address string to parse (e.g., "922 N 5th St Suite 100A Phoenix AZ 85004")'
        )
    })
  )
  .output(
    z.object({
      parsedAddress: z
        .record(z.string(), z.any())
        .describe('The parsed address components (street, city, state, zip, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.addressParse(ctx.input.address);

    return {
      output: {
        parsedAddress: result
      },
      message: `Parsed address "${ctx.input.address}" into components`
    };
  })
  .build();
