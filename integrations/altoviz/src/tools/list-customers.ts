import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    countryIso: z.string().nullable().optional(),
    formattedAddress: z.string().nullable().optional(),
    inlineAddress: z.string().nullable().optional()
  })
  .optional()
  .nullable();

let customerSchema = z.object({
  customerId: z.number().describe('Altoviz customer ID'),
  number: z.string().nullable().optional().describe('Customer number'),
  companyName: z.string().nullable().optional().describe('Company name'),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  cellPhone: z.string().nullable().optional(),
  type: z.string().nullable().optional().describe('Customer type (e.g. Company, Individual)'),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  internalId: z.string().nullable().optional().describe('Your custom internal ID')
});

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List customers from your Altoviz account. Supports pagination and filtering by email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter customers by email address'),
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customers = await client.listCustomers({
      email: ctx.input.email,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = customers.map((c: any) => ({
      customerId: c.id,
      number: c.number,
      companyName: c.companyName,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      cellPhone: c.cellPhone,
      type: c.type,
      billingAddress: c.billingAddress,
      shippingAddress: c.shippingAddress,
      internalId: c.internalId
    }));

    return {
      output: { customers: mapped },
      message: `Found **${mapped.length}** customer(s).`
    };
  })
  .build();
