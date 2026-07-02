import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific DPD customer by their ID, including name, email, and newsletter subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The unique ID of the customer to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Unique customer ID'),
      firstname: z.string().describe('Customer first name'),
      lastname: z.string().describe('Customer last name'),
      email: z.string().describe('Customer email address'),
      receivesEmail: z.boolean().describe('Whether the customer receives newsletters'),
      createdAt: z.number().describe('Creation timestamp (UNIX)'),
      updatedAt: z.number().describe('Last updated timestamp (UNIX)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: customer,
      message: `Retrieved customer **${customer.firstname} ${customer.lastname}** (ID: ${customer.customerId}, email: ${customer.email}).`
    };
  })
  .build();
