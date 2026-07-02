import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z
  .object({
    email: z.string().optional().describe('Contact email address'),
    sms: z.string().optional().describe('Contact mobile phone number for SMS'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    phone1: z.string().optional().describe('Primary phone number'),
    phone2: z.string().optional().describe('Secondary phone number'),
    fax: z.string().optional().describe('Fax number'),
    street: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    zipCode: z.string().optional().describe('Zip code'),
    birthday: z.string().optional().describe('Birthday (date string)'),
    anniversary: z.string().optional().describe('Anniversary (date string)'),
    status: z
      .enum(['Active', 'Unsubscribed', 'Bounced'])
      .optional()
      .describe('Email subscription status'),
    smsStatus: z
      .enum(['Active', 'Unsubscribed', 'Bounced'])
      .optional()
      .describe('SMS subscription status')
  })
  .describe('Contact fields to set');

let contactOutputSchema = z.object({
  contactId: z.number().describe('Contact ID'),
  email: z.string().nullable().optional().describe('Contact email'),
  sms: z.string().nullable().optional().describe('Contact SMS number'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  phone1: z.string().nullable().optional().describe('Primary phone'),
  phone2: z.string().nullable().optional().describe('Secondary phone'),
  city: z.string().nullable().optional().describe('City'),
  street: z.string().nullable().optional().describe('Street'),
  zipCode: z.string().nullable().optional().describe('Zip code'),
  birthday: z.string().nullable().optional().describe('Birthday'),
  anniversary: z.string().nullable().optional().describe('Anniversary'),
  status: z.string().nullable().optional().describe('Email subscription status'),
  isDeleted: z.boolean().optional().describe('Whether the contact is deleted')
});

let mapContactToApi = (input: Record<string, any>) => {
  let data: Record<string, any> = {};
  if (input.email !== undefined) data.email = input.email;
  if (input.sms !== undefined) data.sms = input.sms;
  if (input.firstName !== undefined) data.first_name = input.firstName;
  if (input.lastName !== undefined) data.last_name = input.lastName;
  if (input.phone1 !== undefined) data.phone1 = input.phone1;
  if (input.phone2 !== undefined) data.phone2 = input.phone2;
  if (input.fax !== undefined) data.fax = input.fax;
  if (input.street !== undefined) data.street = input.street;
  if (input.city !== undefined) data.city = input.city;
  if (input.zipCode !== undefined) data.zip_code = input.zipCode;
  if (input.birthday !== undefined) data.birthday = input.birthday;
  if (input.anniversary !== undefined) data.anniversary = input.anniversary;
  if (input.status !== undefined) data.status = input.status;
  if (input.smsStatus !== undefined) data.sms_status = input.smsStatus;
  return data;
};

let mapContactFromApi = (raw: any) => ({
  contactId: raw.id,
  email: raw.email,
  sms: raw.sms,
  firstName: raw.first_name,
  lastName: raw.last_name,
  phone1: raw.phone1,
  phone2: raw.phone2,
  city: raw.city,
  street: raw.street,
  zipCode: raw.zip_code,
  birthday: raw.birthday,
  anniversary: raw.anniversary,
  status: raw.status,
  isDeleted: raw.is_deleted
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in ActiveTrail. At least one of **email** or **sms** is required. The contact is created globally and is not linked to any group by default.`,
  tags: { destructive: false, readOnly: false }
})
  .input(contactSchema)
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let apiData = mapContactToApi(ctx.input);
    let result = await client.createContact(apiData);
    return {
      output: mapContactFromApi(result),
      message: `Contact created with ID **${result.id}** (${result.email || result.sms}).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in ActiveTrail by contact ID. Only the provided fields will be updated.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      fields: contactSchema
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let apiData = mapContactToApi(ctx.input.fields);
    let result = await client.updateContact(ctx.input.contactId, apiData);
    return {
      output: mapContactFromApi(result),
      message: `Contact **${ctx.input.contactId}** updated.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from ActiveTrail by contact ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteContact(ctx.input.contactId);
    return {
      output: { success: true },
      message: `Contact **${ctx.input.contactId}** deleted.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID, including their profile fields, subscription status, group memberships, mailing list memberships, and activity history.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve'),
      includeGroups: z.boolean().optional().describe('Include group memberships'),
      includeMailingLists: z.boolean().optional().describe('Include mailing list memberships'),
      includeActivity: z.boolean().optional().describe('Include activity history')
    })
  )
  .output(
    z.object({
      contact: contactOutputSchema,
      groups: z.array(z.any()).optional().describe('Groups this contact belongs to'),
      mailingLists: z
        .array(z.any())
        .optional()
        .describe('Mailing lists this contact belongs to'),
      activities: z.array(z.any()).optional().describe('Contact activity history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let contact = await client.getContact(ctx.input.contactId);
    let output: Record<string, any> = { contact: mapContactFromApi(contact) };

    if (ctx.input.includeGroups) {
      output.groups = await client.getContactGroups(ctx.input.contactId);
    }
    if (ctx.input.includeMailingLists) {
      output.mailingLists = await client.getContactMailingLists(ctx.input.contactId);
    }
    if (ctx.input.includeActivity) {
      output.activities = await client.getContactActivity(ctx.input.contactId);
    }

    return {
      output: output as any,
      message: `Retrieved contact **${ctx.input.contactId}** (${contact.email || contact.sms}).`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list contacts with optional filtering by status, search term, and date range. Returns paginated results (default 20, max 100 per page).`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      status: z
        .enum(['Active', 'Unsubscribed', 'Bounced'])
        .optional()
        .describe('Filter by contact status'),
      searchTerm: z.string().optional().describe('Search by email or SMS number'),
      fromDate: z
        .string()
        .optional()
        .describe('Filter by status change from date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter by status change to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number (starting from 1)'),
      limit: z.number().optional().describe('Results per page (max 100, default 20)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listContacts({
      customerStates: ctx.input.status,
      searchTerm: ctx.input.searchTerm,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let contacts = Array.isArray(result) ? result : [];
    return {
      output: { contacts: contacts.map(mapContactFromApi) },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();

export let importContacts = SlateTool.create(spec, {
  name: 'Import Contacts',
  key: 'import_contacts',
  description: `Bulk import up to 1,000 contacts into a specified group. Each contact requires at least an **email** or **sms** field.`,
  constraints: ['Maximum 1,000 contacts per import call'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to import contacts into'),
      contacts: z.array(contactSchema).describe('Array of contacts to import (max 1000)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Import result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let apiContacts = ctx.input.contacts.map(mapContactToApi);
    let result = await client.importContacts(ctx.input.groupId, apiContacts);
    return {
      output: { result },
      message: `Imported **${ctx.input.contacts.length}** contact(s) into group **${ctx.input.groupId}**.`
    };
  })
  .build();
