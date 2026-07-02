import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client (company) in ServiceM8. The name is required. Optionally provide address, website, and billing details. Returns the UUID of the newly created client.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company/client name (required)'),
      addressStreet: z.string().optional().describe('Street address (max 500 chars)'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State/province'),
      addressPostcode: z.string().optional().describe('Postal/zip code'),
      addressCountry: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Company website URL'),
      isIndividual: z
        .string()
        .optional()
        .describe('Set to "1" if this is an individual, not a company'),
      billingAttention: z.string().optional().describe('Billing attention line'),
      paymentTerms: z.string().optional().describe('Payment terms')
    })
  )
  .output(
    z.object({
      companyUuid: z.string().describe('UUID of the newly created client')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.addressStreet) data.address_street = ctx.input.addressStreet;
    if (ctx.input.addressCity) data.address_city = ctx.input.addressCity;
    if (ctx.input.addressState) data.address_state = ctx.input.addressState;
    if (ctx.input.addressPostcode) data.address_postcode = ctx.input.addressPostcode;
    if (ctx.input.addressCountry) data.address_country = ctx.input.addressCountry;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.isIndividual) data.is_individual = ctx.input.isIndividual;
    if (ctx.input.billingAttention) data.billing_attention = ctx.input.billingAttention;
    if (ctx.input.paymentTerms) data.payment_terms = ctx.input.paymentTerms;

    let companyUuid = await client.createCompany(data);

    return {
      output: { companyUuid },
      message: `Created new client **${ctx.input.name}** with UUID **${companyUuid}**.`
    };
  })
  .build();
