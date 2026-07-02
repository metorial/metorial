import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAddresses = SlateTool.create(spec, {
  name: 'Manage Addresses',
  key: 'manage_addresses',
  description: `Add, update, or remove postal addresses for a person in CentralStationCRM. Each person can have multiple addresses (e.g., work, home).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'remove', 'list']).describe('Action to perform'),
      personId: z.number().describe('ID of the person'),
      addressId: z
        .number()
        .optional()
        .describe('ID of the address (required for update and remove)'),
      street: z.string().optional().describe('Street address'),
      zip: z.string().optional().describe('ZIP/postal code'),
      city: z.string().optional().describe('City name'),
      stateCode: z.string().optional().describe('State/region code'),
      countryCode: z.string().optional().describe('Country code (e.g., "DE", "US")'),
      addressType: z.string().optional().describe('Type of address (e.g., "work", "home")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      addressId: z.number().optional().describe('ID of the address'),
      addresses: z
        .array(z.any())
        .optional()
        .describe('List of addresses (when action is "list")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.action === 'list') {
      let result = await client.listPersonAddresses(ctx.input.personId);
      let items = Array.isArray(result) ? result : [];

      return {
        output: {
          success: true,
          addresses: items
        },
        message: `Found **${items.length}** addresses for person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'add') {
      let result = await client.createPersonAddress(ctx.input.personId, {
        street: ctx.input.street,
        zip: ctx.input.zip,
        city: ctx.input.city,
        state_code: ctx.input.stateCode,
        country_code: ctx.input.countryCode,
        type: ctx.input.addressType
      });
      let addr = result?.addr ?? result;

      return {
        output: {
          success: true,
          addressId: addr?.id
        },
        message: `Added address to person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.addressId)
        throw new Error('addressId is required when updating an address');

      let data: Record<string, unknown> = {};
      if (ctx.input.street !== undefined) data.street = ctx.input.street;
      if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
      if (ctx.input.city !== undefined) data.city = ctx.input.city;
      if (ctx.input.stateCode !== undefined) data.state_code = ctx.input.stateCode;
      if (ctx.input.countryCode !== undefined) data.country_code = ctx.input.countryCode;
      if (ctx.input.addressType !== undefined) data.type = ctx.input.addressType;

      let result = await client.updatePersonAddress(
        ctx.input.personId,
        ctx.input.addressId,
        data
      );
      let addr = result?.addr ?? result;

      return {
        output: {
          success: true,
          addressId: addr?.id
        },
        message: `Updated address (ID: ${ctx.input.addressId}) for person (ID: ${ctx.input.personId}).`
      };
    }

    // remove
    if (!ctx.input.addressId)
      throw new Error('addressId is required when removing an address');
    await client.deletePersonAddress(ctx.input.personId, ctx.input.addressId);

    return {
      output: {
        success: true,
        addressId: ctx.input.addressId
      },
      message: `Removed address (ID: ${ctx.input.addressId}) from person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
