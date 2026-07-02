import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeliveries = SlateTool.create(spec, {
  name: 'Get Deliveries',
  key: 'get_deliveries',
  description: `Query delivery statuses for sent messages. Look up deliveries by the contact's cell number or by the unique customer ID returned from a send operation.`,
  instructions: ['At least one of cell or customerId must be provided.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cell: z.string().optional().describe('Cell number (MSISDN) of the contact'),
      customerId: z
        .string()
        .optional()
        .describe('Unique send ID returned from a send operation')
    })
  )
  .output(
    z.object({
      deliveries: z.array(z.any()).describe('Array of delivery status records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDeliveries({
      cell: ctx.input.cell,
      customerId: ctx.input.customerId
    });
    let deliveries = Array.isArray(result.data) ? result.data : [];
    return {
      output: { deliveries },
      message: `Found **${deliveries.length}** delivery record(s).`
    };
  })
  .build();
