import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

let _contactFieldsSchema = z.object({
  phoneNumber: z.string().optional().describe('Phone number in E.164 format'),
  email: z.string().optional().describe('Email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  addressLine1: z.string().optional().describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  addressCity: z.string().optional().describe('City'),
  addressState: z.string().optional().describe('State or province'),
  addressPostalCode: z.string().optional().describe('Postal or ZIP code'),
  addressCountry: z.string().optional().describe('Two-letter ISO country code'),
  organizationName: z.string().optional().describe('Organization or company name'),
  faxNumber: z.string().optional().describe('Fax number'),
  custom1: z.string().optional().describe('Custom field 1'),
  custom2: z.string().optional().describe('Custom field 2'),
  custom3: z.string().optional().describe('Custom field 3'),
  custom4: z.string().optional().describe('Custom field 4')
});

let contactOutputSchema = z.object({
  contactId: z.number().describe('Contact ID'),
  listId: z.number().describe('Contact list ID'),
  phoneNumber: z.string().describe('Phone number'),
  email: z.string().optional().describe('Email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  organizationName: z.string().optional().describe('Organization name'),
  addressLine1: z.string().optional().describe('Street address line 1'),
  addressCity: z.string().optional().describe('City'),
  addressCountry: z.string().optional().describe('Country')
});

export let createContactTool = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in a ClickSend contact list. Contacts can be used as recipients for SMS, MMS, voice, and post campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list to add the contact to'),
      phoneNumber: z.string().describe('Phone number in E.164 format (required)'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      addressLine1: z.string().optional().describe('Street address line 1'),
      addressLine2: z.string().optional().describe('Street address line 2'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State or province'),
      addressPostalCode: z.string().optional().describe('Postal or ZIP code'),
      addressCountry: z.string().optional().describe('Two-letter ISO country code'),
      organizationName: z.string().optional().describe('Organization name'),
      custom1: z.string().optional().describe('Custom field 1'),
      custom2: z.string().optional().describe('Custom field 2'),
      custom3: z.string().optional().describe('Custom field 3'),
      custom4: z.string().optional().describe('Custom field 4')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.createContact(ctx.input.listId, {
      phoneNumber: ctx.input.phoneNumber,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      addressLine1: ctx.input.addressLine1,
      addressLine2: ctx.input.addressLine2,
      addressCity: ctx.input.addressCity,
      addressState: ctx.input.addressState,
      addressPostalCode: ctx.input.addressPostalCode,
      addressCountry: ctx.input.addressCountry,
      organizationName: ctx.input.organizationName,
      custom1: ctx.input.custom1,
      custom2: ctx.input.custom2,
      custom3: ctx.input.custom3,
      custom4: ctx.input.custom4
    });

    let contact = result.data;

    return {
      output: {
        contactId: contact.contact_id,
        listId: contact.list_id,
        phoneNumber: contact.phone_number || '',
        email: contact.email || undefined,
        firstName: contact.first_name || undefined,
        lastName: contact.last_name || undefined,
        organizationName: contact.organization_name || undefined,
        addressLine1: contact.address_line_1 || undefined,
        addressCity: contact.address_city || undefined,
        addressCountry: contact.address_country || undefined
      },
      message: `Created contact **${contact.first_name || ''} ${contact.last_name || ''}** (${contact.phone_number}) in list ${ctx.input.listId}.`
    };
  })
  .build();

export let updateContactTool = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details in a ClickSend contact list. Only fields that are provided will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list'),
      contactId: z.number().describe('ID of the contact to update'),
      phoneNumber: z.string().optional().describe('New phone number'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      addressLine1: z.string().optional().describe('New street address line 1'),
      addressLine2: z.string().optional().describe('New street address line 2'),
      addressCity: z.string().optional().describe('New city'),
      addressState: z.string().optional().describe('New state or province'),
      addressPostalCode: z.string().optional().describe('New postal code'),
      addressCountry: z.string().optional().describe('New country code'),
      organizationName: z.string().optional().describe('New organization name'),
      custom1: z.string().optional().describe('Custom field 1'),
      custom2: z.string().optional().describe('Custom field 2'),
      custom3: z.string().optional().describe('Custom field 3'),
      custom4: z.string().optional().describe('Custom field 4')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.updateContact(ctx.input.listId, ctx.input.contactId, {
      phoneNumber: ctx.input.phoneNumber,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      addressLine1: ctx.input.addressLine1,
      addressLine2: ctx.input.addressLine2,
      addressCity: ctx.input.addressCity,
      addressState: ctx.input.addressState,
      addressPostalCode: ctx.input.addressPostalCode,
      addressCountry: ctx.input.addressCountry,
      organizationName: ctx.input.organizationName,
      custom1: ctx.input.custom1,
      custom2: ctx.input.custom2,
      custom3: ctx.input.custom3,
      custom4: ctx.input.custom4
    });

    let contact = result.data;

    return {
      output: {
        contactId: contact.contact_id,
        listId: contact.list_id,
        phoneNumber: contact.phone_number || '',
        email: contact.email || undefined,
        firstName: contact.first_name || undefined,
        lastName: contact.last_name || undefined,
        organizationName: contact.organization_name || undefined,
        addressLine1: contact.address_line_1 || undefined,
        addressCity: contact.address_city || undefined,
        addressCountry: contact.address_country || undefined
      },
      message: `Updated contact **${contact.contact_id}** in list ${ctx.input.listId}.`
    };
  })
  .build();

export let deleteContactTool = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Remove a contact from a ClickSend contact list permanently.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list'),
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    await client.deleteContact(ctx.input.listId, ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact **${ctx.input.contactId}** from list ${ctx.input.listId}.`
    };
  })
  .build();

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from a ClickSend contact list. Supports pagination for large lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the contact list to retrieve contacts from'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of contacts per page')
    })
  )
  .output(
    z.object({
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of contacts'),
      contacts: z.array(contactOutputSchema).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getContacts(ctx.input.listId, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let contacts = (result.data?.data || []).map((c: any) => ({
      contactId: c.contact_id,
      listId: c.list_id,
      phoneNumber: c.phone_number || '',
      email: c.email || undefined,
      firstName: c.first_name || undefined,
      lastName: c.last_name || undefined,
      organizationName: c.organization_name || undefined,
      addressLine1: c.address_line_1 || undefined,
      addressCity: c.address_city || undefined,
      addressCountry: c.address_country || undefined
    }));

    return {
      output: {
        currentPage: result.data?.current_page || 1,
        totalPages: result.data?.last_page || 1,
        totalCount: result.data?.total || 0,
        contacts
      },
      message: `Retrieved **${contacts.length}** contacts from list ${ctx.input.listId}.`
    };
  })
  .build();
