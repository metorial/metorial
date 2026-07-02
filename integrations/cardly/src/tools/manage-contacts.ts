import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.string().describe('Unique contact ID'),
  externalId: z.string().optional().describe('External/CRM ID'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  company: z.string().optional().describe('Company name'),
  address: z.string().describe('Street address'),
  address2: z.string().optional().describe('Address line 2'),
  city: z.string().describe('City'),
  region: z.string().optional().describe('State/province/region'),
  country: z.string().describe('2-character ISO country code'),
  postcode: z.string().optional().describe('Postal/ZIP code'),
  customFields: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let mapContact = (c: Record<string, unknown>) => ({
  contactId: c.id as string,
  externalId: c.externalId as string | undefined,
  firstName: c.firstName as string,
  lastName: c.lastName as string,
  email: c.email as string | undefined,
  company: c.company as string | undefined,
  address: c.address as string,
  address2: c.address2 as string | undefined,
  city: c.city as string,
  region: c.region as string | undefined,
  country: c.country as string,
  postcode: c.postcode as string | undefined,
  customFields: c.customFields as Record<string, unknown> | undefined,
  createdAt: c.createdAt as string,
  updatedAt: c.updatedAt as string
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in a specific contact list. Returns paginated results with contact details including name, address, email, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list'),
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of contacts'),
      totalRecords: z.number().describe('Total number of contacts in the list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listContacts(ctx.input.listId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let contacts = result.contacts.map(c =>
      mapContact(c as unknown as Record<string, unknown>)
    );

    return {
      output: {
        contacts,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${contacts.length}** contact(s) (${result.meta.totalRecords} total) in list **${ctx.input.listId}**.`
    };
  })
  .build();

export let findContact = SlateTool.create(spec, {
  name: 'Find Contact',
  key: 'find_contact',
  description: `Search for a contact within a list by email address or external ID. Returns the matching contact details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list to search'),
      email: z.string().optional().describe('Email address to search for'),
      externalId: z.string().optional().describe('External/CRM ID to search for')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let contact = await client.findContact(ctx.input.listId, {
      email: ctx.input.email,
      externalId: ctx.input.externalId
    });

    return {
      output: mapContact(contact as unknown as Record<string, unknown>),
      message: `Found contact **${contact.firstName} ${contact.lastName}** (${contact.id}).`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a new contact to a contact list with their name, address, and optional custom field values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list to add the contact to'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      email: z.string().optional().describe('Email address'),
      externalId: z.string().optional().describe('External/CRM unique ID for sync matching'),
      company: z.string().optional().describe('Company name'),
      address: z.string().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().describe('City'),
      region: z.string().optional().describe('State/province/region'),
      country: z.string().describe('2-character ISO country code'),
      postcode: z.string().optional().describe('Postal/ZIP code'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values keyed by field slug')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let { listId, ...contactData } = ctx.input;
    let contact = await client.createContact(listId, contactData);

    return {
      output: mapContact(contact as unknown as Record<string, unknown>),
      message: `Contact **${contact.firstName} ${contact.lastName}** created with ID **${contact.id}**.`
    };
  })
  .build();

export let editContact = SlateTool.create(spec, {
  name: 'Edit Contact',
  key: 'edit_contact',
  description: `Update an existing contact's details. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list'),
      contactId: z.string().describe('UUID of the contact to edit'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      externalId: z.string().optional().describe('Updated external/CRM ID'),
      company: z.string().optional().describe('Updated company name'),
      address: z.string().optional().describe('Updated street address'),
      address2: z.string().optional().describe('Updated address line 2'),
      city: z.string().optional().describe('Updated city'),
      region: z.string().optional().describe('Updated state/province/region'),
      country: z.string().optional().describe('Updated 2-character ISO country code'),
      postcode: z.string().optional().describe('Updated postal/ZIP code'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom field values')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let { listId, contactId, ...updateData } = ctx.input;
    let contact = await client.editContact(listId, contactId, updateData);

    return {
      output: mapContact(contact as unknown as Record<string, unknown>),
      message: `Contact **${contact.firstName} ${contact.lastName}** (${contact.id}) updated successfully.`
    };
  })
  .build();

export let syncContact = SlateTool.create(spec, {
  name: 'Sync Contact',
  key: 'sync_contact',
  description: `Create or update a contact using an upsert operation. Matches existing contacts by external ID or email. If a match is found, the contact is updated; otherwise, a new contact is created. Ideal for keeping Cardly contacts in sync with your CRM.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      email: z
        .string()
        .optional()
        .describe('Email address (used for matching existing contacts)'),
      externalId: z
        .string()
        .optional()
        .describe('External/CRM ID (used for matching existing contacts)'),
      company: z.string().optional().describe('Company name'),
      address: z.string().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().describe('City'),
      region: z.string().optional().describe('State/province/region'),
      country: z.string().describe('2-character ISO country code'),
      postcode: z.string().optional().describe('Postal/ZIP code'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values keyed by field slug')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let { listId, ...contactData } = ctx.input;
    let contact = await client.syncContact(listId, contactData);

    return {
      output: mapContact(contact as unknown as Record<string, unknown>),
      message: `Contact **${contact.firstName} ${contact.lastName}** synced successfully (${contact.id}).`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Remove a contact from a contact list. Can delete by contact ID, email address, or external ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list'),
      contactId: z.string().optional().describe('UUID of the contact to delete'),
      email: z
        .string()
        .optional()
        .describe('Email of the contact to delete (alternative to contactId)'),
      externalId: z
        .string()
        .optional()
        .describe('External ID of the contact to delete (alternative to contactId)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      await client.deleteContact(ctx.input.listId, ctx.input.contactId);
    } else {
      await client.deleteContactByFilter(ctx.input.listId, {
        email: ctx.input.email,
        externalId: ctx.input.externalId
      });
    }

    return {
      output: { deleted: true },
      message: `Contact deleted from list **${ctx.input.listId}** successfully.`
    };
  })
  .build();
