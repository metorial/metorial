import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a single customer by their ID, including their properties (addresses, phone numbers, custom fields).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('The unique ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.any())
        .describe('The customer record with all attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let response = await client.getCustomer(ctx.input.customerId, ['properties']);
    let customer = flattenSingleResource(response);

    return {
      output: { customer },
      message: `Retrieved customer **${customer?.name || ctx.input.customerId}**.`
    };
  })
  .build();
