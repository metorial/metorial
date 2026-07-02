import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve a single order by ID, including customer, line items, and planning details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The unique ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      order: z.record(z.string(), z.any()).describe('The order record with all attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let response = await client.getOrder(ctx.input.orderId, ['customer', 'lines']);
    let order = flattenSingleResource(response);

    return {
      output: { order },
      message: `Retrieved order **${order?.number || ctx.input.orderId}** (status: ${order?.status}).`
    };
  })
  .build();
