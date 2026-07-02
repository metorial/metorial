import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomerTool = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer by their ID. Returns the customer's profile, fields, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.any())
        .describe('Customer record with profile data and fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customer
      },
      message: `Retrieved customer **#${ctx.input.customerId}**.`
    };
  });
