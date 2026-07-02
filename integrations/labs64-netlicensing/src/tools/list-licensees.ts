import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicensees = SlateTool.create(spec, {
  name: 'List Licensees',
  key: 'list_licensees',
  description: `Retrieve all licensees (customers) for the current vendor. Licensees are the end customers or product instances that hold licenses.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      licensees: z
        .array(
          z.object({
            licenseeNumber: z.string().describe('Licensee identifier'),
            productNumber: z.string().optional().describe('Associated product number'),
            name: z.string().optional().describe('Licensee name'),
            active: z.boolean().optional().describe('Whether active'),
            markedForTransfer: z.boolean().optional().describe('Whether marked for transfer')
          })
        )
        .describe('List of licensees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listLicensees();
    let licensees = items.map(item => ({
      licenseeNumber: item.number,
      productNumber: item.productNumber,
      name: item.name,
      active: item.active,
      markedForTransfer: item.markedForTransfer
    }));
    return {
      output: { licensees },
      message: `Found **${licensees.length}** licensee(s).`
    };
  })
  .build();
