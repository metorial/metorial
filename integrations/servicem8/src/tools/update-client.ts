import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client (company) in ServiceM8. Modify any combination of fields including name, address, website, and billing details. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      companyUuid: z.string().describe('UUID of the client/company to update'),
      name: z.string().optional().describe('Updated company name'),
      addressStreet: z.string().optional().describe('Updated street address'),
      addressCity: z.string().optional().describe('Updated city'),
      addressState: z.string().optional().describe('Updated state/province'),
      addressPostcode: z.string().optional().describe('Updated postal/zip code'),
      addressCountry: z.string().optional().describe('Updated country'),
      website: z.string().optional().describe('Updated website URL'),
      billingAttention: z.string().optional().describe('Updated billing attention line'),
      paymentTerms: z.string().optional().describe('Updated payment terms')
    })
  )
  .output(
    z.object({
      companyUuid: z.string().describe('UUID of the updated client')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.addressStreet !== undefined) data.address_street = ctx.input.addressStreet;
    if (ctx.input.addressCity !== undefined) data.address_city = ctx.input.addressCity;
    if (ctx.input.addressState !== undefined) data.address_state = ctx.input.addressState;
    if (ctx.input.addressPostcode !== undefined)
      data.address_postcode = ctx.input.addressPostcode;
    if (ctx.input.addressCountry !== undefined)
      data.address_country = ctx.input.addressCountry;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.billingAttention !== undefined)
      data.billing_attention = ctx.input.billingAttention;
    if (ctx.input.paymentTerms !== undefined) data.payment_terms = ctx.input.paymentTerms;

    await client.updateCompany(ctx.input.companyUuid, data);

    return {
      output: { companyUuid: ctx.input.companyUuid },
      message: `Updated client **${ctx.input.companyUuid}**. Changed fields: ${Object.keys(data).join(', ')}.`
    };
  })
  .build();
