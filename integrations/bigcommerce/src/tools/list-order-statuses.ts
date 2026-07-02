import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrderStatuses = SlateTool.create(spec, {
  name: 'List Order Statuses',
  key: 'list_order_statuses',
  description: `List BigCommerce order statuses and their IDs. Use this before updating an order status when you need the correct statusId value.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      statuses: z.array(z.any()).describe('Array of order status objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let statuses = await client.listOrderStatuses();

    return {
      output: { statuses },
      message: `Found ${statuses.length} order statuses.`
    };
  })
  .build();
