import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransferPortal = SlateTool.create(spec, {
  name: 'Get Transfer Portal',
  key: 'get_transfer_portal',
  description: `Retrieve transfer portal entries for a given year. Shows players who have entered the transfer portal, their origin school, destination (if committed), position, and eligibility status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      year: z.number().describe('Transfer portal year')
    })
  )
  .output(
    z.object({
      transfers: z.array(z.any()).describe('Array of transfer portal entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let transfers = await client.getTransferPortal({ year: ctx.input.year });

    let count = Array.isArray(transfers) ? transfers.length : 0;
    return {
      output: { transfers },
      message: `Found **${count}** transfer portal entries for ${ctx.input.year}.`
    };
  })
  .build();
