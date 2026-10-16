import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageReturnAddresses = SlateTool.create(spec, {
  name: 'Manage Return Addresses',
  key: 'manage_return_addresses',
  description:
    'Create or delete a saved sender address, or choose the default sender address for basket orders. Use list_return_addresses to find existing address IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete', 'set_default']).describe('Operation to perform'),
      addressId: z
        .string()
        .optional()
        .describe(
          'Address ID from list_return_addresses; required for delete and set_default'
        ),
      firstName: z.string().optional().describe('Sender first name for create'),
      lastName: z.string().optional().describe('Sender last name for create'),
      businessName: z.string().optional().describe('Sender business name for create'),
      address1: z.string().optional().describe('Street address line 1; required for create'),
      address2: z.string().optional().describe('Street address line 2 for create'),
      city: z.string().optional().describe('City; required for create'),
      state: z.string().optional().describe('State or province for create'),
      zip: z.string().optional().describe('Postal code; required for create'),
      countryId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Country ID from list_countries for create'),
      setDefault: z
        .boolean()
        .optional()
        .describe('Whether the new sender address should be the default')
    })
  )
  .output(
    z.object({
      addressId: z.string().optional().describe('Created or selected sender address ID'),
      result: z.record(z.string(), z.unknown()).describe('Response returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.action === 'create') {
      if (!ctx.input.address1 || !ctx.input.city || !ctx.input.zip) {
        throw createApiServiceError(
          'address1, city, and zip are required to create a sender address.'
        );
      }
      let result = await client.createReturnAddress({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        businessName: ctx.input.businessName,
        address1: ctx.input.address1,
        address2: ctx.input.address2,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip,
        countryId: ctx.input.countryId,
        setDefault: ctx.input.setDefault
      });
      if (result.address?.id === undefined || result.address?.id === null) {
        throw createApiServiceError(
          'Handwrytten did not return a sender address ID. Check list_return_addresses before retrying.'
        );
      }
      return {
        output: { addressId: String(result.address.id), result },
        message: `Created sender address \`${result.address.id}\`.`
      };
    }
    if (!ctx.input.addressId) {
      throw createApiServiceError('Provide addressId from list_return_addresses.');
    }
    let result =
      ctx.input.action === 'delete'
        ? await client.deleteReturnAddress(ctx.input.addressId)
        : await client.setDefaultReturnAddress(ctx.input.addressId);
    return {
      output: { addressId: ctx.input.addressId, result },
      message:
        ctx.input.action === 'delete'
          ? `Deleted sender address \`${ctx.input.addressId}\`.`
          : `Set default sender address to \`${ctx.input.addressId}\`.`
    };
  })
  .build();
