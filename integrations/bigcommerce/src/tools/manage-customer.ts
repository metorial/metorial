import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description: `Create, update, or delete a customer. When creating, provide first name, last name, and email. When updating, provide the customer ID and the fields to change. Supports managing addresses alongside the customer.`,
  instructions: [
    'Use action "create" to create a new customer.',
    'Use action "update" to modify an existing customer by customerId.',
    'Use action "delete" to remove a customer by customerId.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      customerId: z.number().optional().describe('Customer ID (required for update/delete)'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email address'),
      company: z.string().optional().describe('Customer company name'),
      phone: z.string().optional().describe('Customer phone number'),
      notes: z.string().optional().describe('Internal notes about the customer'),
      customerGroupId: z.number().optional().describe('Customer group ID to assign'),
      addresses: z
        .array(
          z.object({
            firstName: z.string().optional().describe('Address first name'),
            lastName: z.string().optional().describe('Address last name'),
            address1: z.string().optional().describe('Address line 1'),
            address2: z.string().optional().describe('Address line 2'),
            city: z.string().optional().describe('City'),
            stateOrProvince: z.string().optional().describe('State or province'),
            postalCode: z.string().optional().describe('Postal/zip code'),
            countryCode: z.string().optional().describe('ISO 2-letter country code'),
            phone: z.string().optional().describe('Phone number for this address'),
            addressType: z
              .enum(['residential', 'commercial'])
              .optional()
              .describe('Address type')
          })
        )
        .optional()
        .describe('Customer addresses to set during creation')
    })
  )
  .output(
    z.object({
      customer: z.any().optional().describe('The created or updated customer object'),
      deleted: z.boolean().optional().describe('Whether the customer was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.customerId)
        throw bigcommerceServiceError('customerId is required for delete');
      await client.deleteCustomers([ctx.input.customerId]);
      return {
        output: { deleted: true },
        message: `Deleted customer with ID ${ctx.input.customerId}.`
      };
    }

    let customerData: Record<string, any> = {};
    if (ctx.input.firstName) customerData.first_name = ctx.input.firstName;
    if (ctx.input.lastName) customerData.last_name = ctx.input.lastName;
    if (ctx.input.email) customerData.email = ctx.input.email;
    if (ctx.input.company) customerData.company = ctx.input.company;
    if (ctx.input.phone) customerData.phone = ctx.input.phone;
    if (ctx.input.notes) customerData.notes = ctx.input.notes;
    if (ctx.input.customerGroupId !== undefined)
      customerData.customer_group_id = ctx.input.customerGroupId;
    if (ctx.input.addresses) {
      customerData.addresses = ctx.input.addresses.map(addr => ({
        first_name: addr.firstName,
        last_name: addr.lastName,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        state_or_province: addr.stateOrProvince,
        postal_code: addr.postalCode,
        country_code: addr.countryCode,
        phone: addr.phone,
        address_type: addr.addressType
      }));
    }

    if (ctx.input.action === 'create') {
      let result = await client.createCustomers([customerData]);
      let customer = result.data[0];
      return {
        output: { customer },
        message: `Created customer **${customer.first_name} ${customer.last_name}** (ID: ${customer.id}).`
      };
    }

    if (!ctx.input.customerId)
      throw bigcommerceServiceError('customerId is required for update');
    customerData.id = ctx.input.customerId;
    let result = await client.updateCustomers([customerData]);
    let customer = result.data[0];
    return {
      output: { customer },
      message: `Updated customer **${customer.first_name} ${customer.last_name}** (ID: ${customer.id}).`
    };
  })
  .build();
