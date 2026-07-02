import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let upsertCustomer = SlateTool.create(spec, {
  name: 'Create or Update Customer',
  key: 'upsert_customer',
  description: `Create a new customer or update an existing one in Simplesat. The customer's email is used as the unique identifier — if a customer with the given email already exists, their record will be updated. Custom attribute fields that don't exist yet will be created automatically.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email address (used as the unique key)'),
      name: z.string().optional().describe('Customer name'),
      company: z.string().optional().describe('Customer company or organization name'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom attribute key-value pairs (new attributes are created automatically)'
        )
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.unknown())
        .describe('The created or updated customer record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.upsertCustomer({
      email: ctx.input.email,
      name: ctx.input.name,
      company: ctx.input.company,
      customAttributes: ctx.input.customAttributes
    });

    return {
      output: {
        customer: result
      },
      message: `Customer **${ctx.input.email}** has been created or updated.`
    };
  })
  .build();
