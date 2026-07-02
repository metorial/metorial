import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer (counterparty) record in Firmao. Only provided fields will be updated; omitted fields remain unchanged.`
})
  .input(
    z.object({
      customerId: z.number().describe('ID of the customer to update'),
      name: z.string().optional().describe('Updated customer name'),
      label: z.string().optional().describe('Updated label'),
      customerType: z.string().optional().describe('Updated customer type'),
      nipNumber: z.string().optional().describe('Updated NIP/tax number'),
      bankAccountNumber: z.string().optional().describe('Updated bank account number'),
      emails: z.array(z.string()).optional().describe('Updated email addresses'),
      phones: z.array(z.string()).optional().describe('Updated phone numbers'),
      website: z.string().optional().describe('Updated website URL'),
      description: z.string().optional().describe('Updated description'),
      officeStreet: z.string().optional().describe('Updated office street'),
      officeCity: z.string().optional().describe('Updated office city'),
      officePostCode: z.string().optional().describe('Updated office post code'),
      officeCountry: z.string().optional().describe('Updated office country'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields to update')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.label) body.label = ctx.input.label;
    if (ctx.input.customerType) body.customerType = ctx.input.customerType;
    if (ctx.input.nipNumber) body.nipNumber = ctx.input.nipNumber;
    if (ctx.input.bankAccountNumber) body.bankAccountNumber = ctx.input.bankAccountNumber;
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phones) body.phones = ctx.input.phones;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.description) body.description = ctx.input.description;

    if (ctx.input.officeStreet !== undefined)
      body['officeAddress.street'] = ctx.input.officeStreet;
    if (ctx.input.officeCity !== undefined) body['officeAddress.city'] = ctx.input.officeCity;
    if (ctx.input.officePostCode !== undefined)
      body['officeAddress.postCode'] = ctx.input.officePostCode;
    if (ctx.input.officeCountry !== undefined)
      body['officeAddress.country'] = ctx.input.officeCountry;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        body[key] = value;
      }
    }

    await client.update('customers', ctx.input.customerId, body);

    return {
      output: {
        customerId: ctx.input.customerId,
        updated: true
      },
      message: `Updated customer ID **${ctx.input.customerId}**.`
    };
  })
  .build();
