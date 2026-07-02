import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireSquarespaceString, squarespaceServiceError } from '../lib/errors';
import { spec } from '../spec';

let addressSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().describe('Recipient last name'),
  line1: z.string().describe('Street address line 1'),
  line2: z.string().optional().describe('Street address line 2'),
  city: z.string().describe('City'),
  region: z.string().describe('State, province, or region'),
  countryCode: z.string().describe('ISO country code'),
  postalCode: z.string().describe('Postal or ZIP code'),
  phoneNumber: z.string().optional().describe('Recipient phone number')
});

export let manageContactAddress = SlateTool.create(spec, {
  name: 'Manage Contact Address',
  key: 'manage_contact_address',
  description: `List, create, retrieve, replace, or delete Squarespace contact address book entries. Address book entries belong to Contacts API contacts and can be used for shipping and fulfillment data.`,
  instructions: [
    'For list, provide contactId and optionally cursor',
    'For create, provide contactId and address',
    'For get, replace, or delete, provide contactId and addressBookEntryId',
    'For replace, provide a full address object'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'replace', 'delete'])
        .describe('Operation to perform'),
      contactId: z.string().describe('Contact ID that owns the address book'),
      addressBookEntryId: z
        .string()
        .optional()
        .describe('Address book entry ID for get, replace, and delete'),
      cursor: z.string().optional().describe('Pagination cursor for list'),
      address: addressSchema.optional().describe('Address payload for create and replace'),
      defaultShipping: z
        .boolean()
        .optional()
        .describe('Whether this entry should be the default shipping address')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      addressBook: z.any().optional().describe('Address book data for list'),
      addressBookEntry: z.any().optional().describe('Address book entry data'),
      addressBookEntryId: z.string().optional().describe('Address book entry ID'),
      hasNextPage: z.boolean().optional().describe('Whether more address entries exist'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page'),
      deleted: z.boolean().optional().describe('Whether the address was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listContactAddresses(ctx.input.contactId, ctx.input.cursor);
      let entries = result.addressBook.addressBookEntries || [];

      return {
        output: {
          action: 'listed',
          addressBook: result.addressBook,
          hasNextPage: result.pagination.hasNextPage,
          nextPageCursor: result.pagination.nextPageCursor
        },
        message: `Retrieved **${entries.length}** address book entr${entries.length === 1 ? 'y' : 'ies'}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.address) {
        throw squarespaceServiceError('address is required for "create".');
      }

      let addressBookEntry = await client.createContactAddress(ctx.input.contactId, {
        address: ctx.input.address,
        defaultShipping: ctx.input.defaultShipping
      });

      return {
        output: {
          action: 'created',
          addressBookEntryId: addressBookEntry.id,
          addressBookEntry
        },
        message: `Created address book entry **${addressBookEntry.id}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let addressBookEntryId = requireSquarespaceString(
        ctx.input.addressBookEntryId,
        'addressBookEntryId',
        'get'
      );
      let addressBookEntry = await client.getContactAddress(
        ctx.input.contactId,
        addressBookEntryId
      );

      return {
        output: {
          action: 'retrieved',
          addressBookEntryId: addressBookEntry.id || addressBookEntryId,
          addressBookEntry
        },
        message: `Retrieved address book entry **${addressBookEntry.id || addressBookEntryId}**.`
      };
    }

    if (ctx.input.action === 'replace') {
      let addressBookEntryId = requireSquarespaceString(
        ctx.input.addressBookEntryId,
        'addressBookEntryId',
        'replace'
      );
      if (!ctx.input.address) {
        throw squarespaceServiceError('address is required for "replace".');
      }

      let addressBookEntry = await client.replaceContactAddress(
        ctx.input.contactId,
        addressBookEntryId,
        {
          address: ctx.input.address,
          defaultShipping: ctx.input.defaultShipping
        }
      );

      return {
        output: {
          action: 'replaced',
          addressBookEntryId: addressBookEntry.id || addressBookEntryId,
          addressBookEntry
        },
        message: `Replaced address book entry **${addressBookEntry.id || addressBookEntryId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let addressBookEntryId = requireSquarespaceString(
        ctx.input.addressBookEntryId,
        'addressBookEntryId',
        'delete'
      );

      await client.deleteContactAddress(ctx.input.contactId, addressBookEntryId);

      return {
        output: {
          action: 'deleted',
          addressBookEntryId,
          deleted: true
        },
        message: `Deleted address book entry **${addressBookEntryId}**.`
      };
    }

    throw squarespaceServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
