import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressionLists = SlateTool.create(spec, {
  name: 'Manage Suppression Lists',
  key: 'manage_suppression_lists',
  description: `List, create, retrieve, or delete suppression lists, browse suppressed contacts, and add or remove contacts. Suppression lists prevent specific contacts from receiving mailings, useful for opt-outs, existing customers, or do-not-mail lists.`,
  instructions: [
    'Use action "list" to discover suppression list IDs, "get" to inspect one list, or "create" to create a list.',
    'Use action "list_contacts" or "get_contact" to browse suppressed contacts; use offset for pagination.',
    'Use action "delete_contact" to remove a contact from suppression, or "delete" to remove an entire suppression list.',
    'Use action "add_contact" to add a contact to a suppression list by listId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'delete',
          'list_contacts',
          'get_contact',
          'delete_contact',
          'add_contact'
        ])
        .describe('The action to perform'),
      listId: z
        .string()
        .optional()
        .describe(
          'Suppression list ID, discovered with list. Required for every action except list and create.'
        ),
      name: z.string().optional().describe('Name of the new suppression list for create'),
      country: z
        .string()
        .optional()
        .describe('Country code for the new suppression list, such as US or CA'),
      contactId: z
        .string()
        .optional()
        .describe(
          'Suppressed contact ID for get_contact or delete_contact. Discover IDs with list_contacts.'
        ),
      offset: z
        .number()
        .optional()
        .describe('Pagination offset for list_contacts or get_contact'),
      contact: z
        .object({
          firstName: z.string().describe('First name'),
          lastName: z.string().describe('Last name'),
          company: z.string().optional().describe('Company name'),
          addressStreet: z.string().describe('Street address'),
          addressStreet2: z.string().optional().describe('Street address line 2'),
          addressCity: z.string().describe('City'),
          addressState: z.string().describe('State abbreviation'),
          addressZip: z.string().describe('ZIP code')
        })
        .optional()
        .describe('Contact to add to suppression list (required for add_contact)')
    })
  )
  .output(
    z.object({
      suppressionLists: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of suppression lists'),
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let suppressionLists = await client.getSuppressionLists();
      return {
        output: { suppressionLists },
        message: `Found **${suppressionLists.length}** suppression list(s).`
      };
    }

    if (action === 'create') {
      let suppressionLists = await client.createSuppressionList({
        name: ctx.input.name,
        country: ctx.input.country
      });
      return { output: { suppressionLists }, message: 'Created the suppression list.' };
    }

    if (action === 'get' || action === 'delete') {
      if (!ctx.input.listId) throw createApiServiceError('listId is required for this action');
      if (action === 'get') {
        let suppressionLists = await client.getSuppressionList(ctx.input.listId);
        return { output: { suppressionLists }, message: 'Retrieved the suppression list.' };
      }
      let result = await client.deleteSuppressionList(ctx.input.listId);
      return { output: { result }, message: 'Deleted the suppression list.' };
    }

    if (
      action === 'list_contacts' ||
      action === 'get_contact' ||
      action === 'delete_contact'
    ) {
      if (!ctx.input.listId) throw createApiServiceError('listId is required for this action');
      if (action !== 'list_contacts' && !ctx.input.contactId) {
        throw createApiServiceError('contactId is required for this action');
      }
      if (
        ctx.input.offset !== undefined &&
        (!Number.isInteger(ctx.input.offset) || ctx.input.offset < 0)
      ) {
        throw createApiServiceError('offset must be a non-negative whole number.');
      }
      let result: Record<string, unknown>;
      if (action === 'delete_contact') {
        if (!ctx.input.contactId)
          throw createApiServiceError('contactId is required for delete_contact');
        result = await client.deleteSuppressedContact(ctx.input.listId, ctx.input.contactId);
      } else {
        result = await client.getSuppressedContacts(ctx.input.listId, {
          offset: ctx.input.offset,
          contactId: action === 'get_contact' ? ctx.input.contactId : undefined
        });
      }
      return {
        output: { result },
        message:
          action === 'delete_contact'
            ? 'Removed the contact from suppression.'
            : 'Retrieved suppressed contact details.'
      };
    }

    if (action === 'add_contact') {
      if (!ctx.input.listId)
        throw createApiServiceError('listId is required for add_contact action');
      if (!ctx.input.contact)
        throw createApiServiceError('contact is required for add_contact action');
      let result = await client.addSuppressedContact(ctx.input.listId, {
        firstName: ctx.input.contact.firstName,
        lastName: ctx.input.contact.lastName,
        company: ctx.input.contact.company,
        addressStreet: ctx.input.contact.addressStreet,
        addressStreet2: ctx.input.contact.addressStreet2,
        addressCity: ctx.input.contact.addressCity,
        addressState: ctx.input.contact.addressState,
        addressZip: ctx.input.contact.addressZip
      });
      return {
        output: { result },
        message: `Contact **${ctx.input.contact.firstName} ${ctx.input.contact.lastName}** added to suppression list.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
