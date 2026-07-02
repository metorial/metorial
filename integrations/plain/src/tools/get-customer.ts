import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Look up a single customer by ID, email, or external ID. Returns detailed customer information including company and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Plain customer ID'),
      email: z.string().optional().describe('Customer email address'),
      externalId: z.string().optional().describe('External customer ID')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('Plain customer ID'),
      fullName: z.string().nullable().describe('Customer full name'),
      shortName: z.string().nullable().describe('Customer short name'),
      email: z.string().nullable().describe('Customer email address'),
      emailVerified: z.boolean().nullable().describe('Whether the email is verified'),
      externalId: z.string().nullable().describe('External customer ID'),
      companyId: z.string().nullable().describe('Company ID'),
      companyName: z.string().nullable().describe('Company name'),
      companyDomain: z.string().nullable().describe('Company domain'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customer: any;
    if (ctx.input.customerId) {
      customer = await client.getCustomerById(ctx.input.customerId);
    } else if (ctx.input.email) {
      customer = await client.getCustomerByEmail(ctx.input.email);
    } else if (ctx.input.externalId) {
      customer = await client.getCustomerByExternalId(ctx.input.externalId);
    } else {
      throw new Error('Provide one of customerId, email, or externalId');
    }

    if (!customer) {
      throw new Error('Customer not found');
    }

    return {
      output: {
        customerId: customer.id,
        fullName: customer.fullName,
        shortName: customer.shortName,
        email: customer.email?.email ?? null,
        emailVerified: customer.email?.isVerified ?? null,
        externalId: customer.externalId,
        companyId: customer.company?.id ?? null,
        companyName: customer.company?.name ?? null,
        companyDomain: customer.company?.domainName ?? null,
        createdAt: customer.createdAt?.iso8601,
        updatedAt: customer.updatedAt?.iso8601
      },
      message: `Found customer **${customer.fullName || customer.email?.email || customer.id}**`
    };
  })
  .build();
