import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

let contactFieldsSchema = z.object({
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  addressStreet: z.string().optional().describe('Street address line 1'),
  addressStreet2: z.string().optional().describe('Street address line 2'),
  addressCity: z.string().optional().describe('City'),
  addressState: z.string().optional().describe('State abbreviation'),
  addressZip: z.string().optional().describe('ZIP code'),
  country: z.string().optional().describe('Country (US or CA)'),
  varField1: z.string().optional().describe('Custom variable field 1'),
  varField2: z.string().optional().describe('Custom variable field 2'),
  varField3: z.string().optional().describe('Custom variable field 3'),
  varField4: z.string().optional().describe('Custom variable field 4'),
  varField5: z.string().optional().describe('Custom variable field 5'),
  varField6: z.string().optional().describe('Custom variable field 6'),
  varField7: z.string().optional().describe('Custom variable field 7'),
  varField8: z.string().optional().describe('Custom variable field 8'),
  varField9: z.string().optional().describe('Custom variable field 9'),
  varField10: z.string().optional().describe('Custom variable field 10')
});

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create, update, retrieve, or delete contacts and contact lists in Postalytics. Supports listing all contact lists, viewing contacts on a list, getting a single contact's details, creating/updating contacts, and deleting contacts. Addresses are automatically validated via CASS and NCOA.`,
  instructions: [
    'Use action "list_lists" to see all contact lists.',
    'Use action "get_contacts" with a listId to browse contacts on a specific list.',
    'Use action "get" with a contactId to get full contact details.',
    'Use action "create" to add a new contact to a list (firstName, lastName, addressStreet, addressCity, addressState, addressZip are required).',
    'Use action "update" to modify an existing contact.',
    'Use action "delete" to remove a contact.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_lists', 'get_contacts', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for get, update, delete actions)'),
      listId: z
        .string()
        .optional()
        .describe('Contact list ID (required for get_contacts, create, update actions)'),
      start: z.number().optional().describe('Pagination offset for get_contacts'),
      limit: z.number().optional().describe('Pagination limit for get_contacts'),
      fields: contactFieldsSchema
        .optional()
        .describe('Contact fields for create/update actions')
    })
  )
  .output(
    z.object({
      lists: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of contact lists'),
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of contacts on a list'),
      contact: z.record(z.string(), z.unknown()).optional().describe('Single contact record'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Operation result for create/update/delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list_lists') {
      let lists = await client.getContactLists();
      return {
        output: { lists },
        message: `Found **${lists.length}** contact list(s).`
      };
    }

    if (action === 'get_contacts') {
      if (!ctx.input.listId) throw new Error('listId is required for get_contacts action');
      let contacts = await client.getContactsOnList(ctx.input.listId, {
        start: ctx.input.start,
        limit: ctx.input.limit
      });
      return {
        output: { contacts },
        message: `Retrieved **${contacts.length}** contact(s) from list.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.contactId) throw new Error('contactId is required for get action');
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: { contact },
        message: `Retrieved contact details for **${contact.first_name || ''} ${contact.last_name || ''}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.listId) throw new Error('listId is required for create action');
      if (!ctx.input.fields) throw new Error('fields are required for create action');
      let fields = ctx.input.fields;
      if (
        !fields.firstName ||
        !fields.lastName ||
        !fields.addressStreet ||
        !fields.addressCity ||
        !fields.addressState ||
        !fields.addressZip
      ) {
        throw new Error(
          'firstName, lastName, addressStreet, addressCity, addressState, addressZip are required'
        );
      }
      let result = await client.createOrUpdateContact({
        contactListId: ctx.input.listId,
        contact: {
          firstName: fields.firstName,
          lastName: fields.lastName,
          company: fields.company,
          addressStreet: fields.addressStreet,
          addressStreet2: fields.addressStreet2,
          addressCity: fields.addressCity,
          addressState: fields.addressState,
          addressZip: fields.addressZip,
          country: fields.country,
          varField1: fields.varField1,
          varField2: fields.varField2,
          varField3: fields.varField3,
          varField4: fields.varField4,
          varField5: fields.varField5,
          varField6: fields.varField6,
          varField7: fields.varField7,
          varField8: fields.varField8,
          varField9: fields.varField9,
          varField10: fields.varField10
        }
      });
      return {
        output: { result },
        message: `Contact **${fields.firstName} ${fields.lastName}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.contactId) throw new Error('contactId is required for update action');
      if (!ctx.input.listId) throw new Error('listId is required for update action');
      if (!ctx.input.fields) throw new Error('fields are required for update action');
      let result = await client.updateContact(ctx.input.contactId, {
        contactListId: ctx.input.listId,
        contact: ctx.input.fields
      });
      return {
        output: { result },
        message: `Contact **${ctx.input.contactId}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.contactId) throw new Error('contactId is required for delete action');
      let result = await client.deleteContact(ctx.input.contactId);
      return {
        output: { result },
        message: `Contact **${ctx.input.contactId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
