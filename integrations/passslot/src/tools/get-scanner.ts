import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getScanner = SlateTool.create(spec, {
  name: 'Get Scanner',
  key: 'get_scanner',
  description:
    'Retrieve a scanner configuration, including its template permissions and device authorization details or browser PIN. Requires an App Key with full access. Call list_scanners to discover scanner IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ scannerId: z.number().describe('Scanner ID from list_scanners') }))
  .output(
    z.object({
      scannerId: z.number(),
      scanner: z
        .record(z.string(), z.any())
        .describe('Complete scanner configuration returned by PassSlot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let scanner = await client.getScanner(ctx.input.scannerId);
    return {
      output: { scannerId: scanner.id, scanner },
      message: `Retrieved scanner **${scanner.name}** (ID: ${scanner.id}).`
    };
  })
  .build();
