import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details or tags in AgencyZoom. Provide only the fields you want to change. If tags are provided, the customer's tags will be replaced via a separate tags endpoint. Returns the updated customer record.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Unique identifier of the customer to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated primary email address'),
      phone: z.string().optional().describe('Updated primary phone number'),
      address: z
        .object({
          street: z.string().optional().describe('Street address line'),
          city: z.string().optional().describe('City name'),
          state: z.string().optional().describe('State or province code'),
          zip: z.string().optional().describe('ZIP or postal code'),
          country: z.string().optional().describe('Country name or code')
        })
        .optional()
        .describe('Updated mailing address'),
      companyName: z.string().optional().describe('Updated company name'),
      fein: z.string().optional().describe('Updated Federal Employer Identification Number'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Array of tag names to set on the customer (replaces existing tags)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of custom field names and their updated values')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.any())
        .describe('The updated customer record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {};

    if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.address !== undefined) data.address = ctx.input.address;
    if (ctx.input.companyName !== undefined) data.companyName = ctx.input.companyName;
    if (ctx.input.fein !== undefined) data.fein = ctx.input.fein;
    if (ctx.input.customFields !== undefined) data.customFields = ctx.input.customFields;

    let customer: any;
    let updatedParts: string[] = [];

    if (Object.keys(data).length > 0) {
      customer = await client.updateCustomer(ctx.input.customerId, data);
      updatedParts.push('details');
    }

    if (ctx.input.tags !== undefined) {
      await client.updateCustomerTags(ctx.input.customerId, { tags: ctx.input.tags });
      updatedParts.push('tags');
    }

    if (!customer) {
      customer = await client.getCustomer(ctx.input.customerId);
    }

    let customerName =
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || ctx.input.customerId;

    return {
      output: { customer },
      message: `Updated ${updatedParts.join(' and ')} for customer **${customerName}**.`
    };
  })
  .build();
