import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customerIdentifierSchema = z
  .object({
    emailAddress: z.string().optional().describe('Customer email address'),
    customerId: z.string().optional().describe('Plain customer ID'),
    externalId: z.string().optional().describe('Your external customer ID')
  })
  .describe('Identifier to look up the customer (provide one)');

let emailSchema = z
  .object({
    email: z.string().describe('Email address'),
    isVerified: z.boolean().optional().describe('Whether the email is verified')
  })
  .optional()
  .describe('Email details');

export let upsertCustomer = SlateTool.create(spec, {
  name: 'Upsert Customer',
  key: 'upsert_customer',
  description: `Create or update a customer in Plain. Uses an upsert pattern — if a customer matching the identifier exists, it will be updated; otherwise a new customer is created. Specify separate fields for creation vs. update via **onCreate** and **onUpdate**.`,
  instructions: [
    'Provide exactly one identifier: emailAddress, customerId, or externalId.',
    'The result field indicates whether the customer was CREATED, UPDATED, or NOOP (no changes).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: customerIdentifierSchema,
      onCreate: z
        .object({
          fullName: z.string().describe('Full name of the customer'),
          shortName: z.string().optional().describe('Short/first name'),
          email: emailSchema,
          externalId: z.string().optional().describe('External ID to associate')
        })
        .describe('Fields to set when creating a new customer'),
      onUpdate: z
        .object({
          fullName: z.string().optional().describe('Updated full name'),
          shortName: z.string().optional().describe('Updated short name'),
          email: emailSchema,
          externalId: z.string().optional().describe('Updated external ID')
        })
        .optional()
        .describe('Fields to set when updating an existing customer')
    })
  )
  .output(
    z.object({
      result: z.string().describe('CREATED, UPDATED, or NOOP'),
      customerId: z.string().describe('Plain customer ID'),
      fullName: z.string().nullable().describe('Customer full name'),
      shortName: z.string().nullable().describe('Customer short name'),
      email: z.string().nullable().describe('Customer email address'),
      externalId: z.string().nullable().describe('External customer ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let res = await client.upsertCustomer({
      identifier: ctx.input.identifier,
      onCreate: ctx.input.onCreate,
      onUpdate: ctx.input.onUpdate || {}
    });

    let customer = res.customer;

    return {
      output: {
        result: res.result,
        customerId: customer.id,
        fullName: customer.fullName,
        shortName: customer.shortName,
        email: customer.email?.email ?? null,
        externalId: customer.externalId
      },
      message: `Customer **${customer.fullName || customer.email?.email || customer.id}** — result: **${res.result}**`
    };
  })
  .build();
