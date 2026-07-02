import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage Customer',
  key: 'manage_customer',
  description: `Update or delete a customer in Finmei. Use this to modify customer details such as name, email, phone, and address, or to permanently remove a customer record.`,
  instructions: [
    'To update a customer, provide the **customerId** and the fields you want to change.',
    'To delete a customer, provide the **customerId** and set **action** to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['update', 'delete'])
        .describe(
          'Action to perform: "update" to modify details, "delete" to remove the customer'
        ),
      customerId: z.string().describe('ID of the customer to manage'),
      name: z.string().optional().describe('Updated customer name'),
      email: z.string().optional().describe('Updated customer email address'),
      phone: z.string().optional().describe('Updated customer phone number'),
      address: z
        .object({
          street: z.string().optional().describe('Street address'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State or region'),
          country: z.string().optional().describe('Country'),
          postalCode: z.string().optional().describe('Postal/zip code')
        })
        .optional()
        .describe('Updated address details')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      customerId: z.string().describe('ID of the customer'),
      customer: z.any().optional().describe('Updated customer details (for update action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteCustomer(ctx.input.customerId);

      return {
        output: {
          success: true,
          customerId: ctx.input.customerId
        },
        message: `Deleted customer \`${ctx.input.customerId}\`.`
      };
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.address) {
      updateData.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        country: ctx.input.address.country,
        postal_code: ctx.input.address.postalCode
      };
    }

    let result = await client.updateCustomer(ctx.input.customerId, updateData);
    let customer = result?.data ?? result;

    return {
      output: {
        success: true,
        customerId: ctx.input.customerId,
        customer
      },
      message: `Updated customer \`${ctx.input.customerId}\`.`
    };
  })
  .build();
