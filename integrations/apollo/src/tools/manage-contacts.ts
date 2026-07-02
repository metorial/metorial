import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let contactFieldsSchema = z.object({
  firstName: z.string().optional().describe('Contact first name'),
  lastName: z.string().optional().describe('Contact last name'),
  email: z.string().optional().describe('Contact email address'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  organizationName: z.string().optional().describe('Company/organization name'),
  ownerId: z.string().optional().describe('Apollo user ID of the contact owner'),
  accountId: z.string().optional().describe('Apollo account ID to associate with'),
  contactStageId: z.string().optional().describe('Contact stage ID'),
  websiteUrl: z.string().optional().describe('Personal or company website URL'),
  linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or region'),
  country: z.string().optional().describe('Country'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  labelIds: z.array(z.string()).optional().describe('Label IDs to apply')
});

let contactOutputSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  emailStatus: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  organizationName: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  contactStageId: z.string().optional(),
  linkedinUrl: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let formatContact = (c: Record<string, any>) => ({
  contactId: optionalString(c.id),
  firstName: optionalString(c.first_name),
  lastName: optionalString(c.last_name),
  name:
    optionalString(c.name) ||
    [optionalString(c.first_name), optionalString(c.last_name)].filter(Boolean).join(' ') ||
    undefined,
  email: optionalString(c.email),
  emailStatus: optionalString(c.email_status),
  title: optionalString(c.title),
  phone: optionalString(c.phone_numbers?.[0]?.raw_number) || optionalString(c.phone),
  organizationName: optionalString(c.organization_name),
  accountId: optionalString(c.account_id),
  ownerId: optionalString(c.owner_id),
  contactStageId: optionalString(c.contact_stage_id),
  linkedinUrl: optionalString(c.linkedin_url),
  city: optionalString(c.city),
  state: optionalString(c.state),
  country: optionalString(c.country),
  createdAt: optionalString(c.created_at),
  updatedAt: optionalString(c.updated_at)
});

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts that have been added to your Apollo account. Contacts are people explicitly added to your database (not the broader Apollo search database). Returns enriched contact data including emails and phone numbers.`,
  constraints: [
    'Maximum 50,000 results (100 per page, up to 500 pages)',
    "Only returns contacts in your team's database — use Search People for the broader Apollo database"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().optional().describe('Keywords to search contacts'),
      contactStageIds: z.array(z.string()).optional().describe('Filter by contact stage IDs'),
      sortByField: z.string().optional().describe('Field to sort results by'),
      sortAscending: z
        .boolean()
        .optional()
        .describe('Sort in ascending order (default: false)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchContacts({
      qKeywords: ctx.input.keywords,
      contactStageIds: ctx.input.contactStageIds,
      sortByField: ctx.input.sortByField,
      sortAscending: ctx.input.sortAscending,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let contacts = result.contacts.map(formatContact);

    return {
      output: {
        contacts,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? contacts.length}** contacts (page ${result.pagination?.page ?? 1} of ${result.pagination?.total_pages ?? 1}). Returned ${contacts.length} results.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in your Apollo account. Contacts are people that your team explicitly adds to the database. Once created, their enriched data is permanently accessible without consuming additional credits.`,
  instructions: [
    'Set runDedupe to true to prevent creating duplicate contacts with matching name, email, or other details.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    contactFieldsSchema.extend({
      runDedupe: z
        .boolean()
        .optional()
        .describe('Enable deduplication to prevent duplicates (default: false)')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      organizationName: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.createContact({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      title: ctx.input.title,
      phone: ctx.input.phone,
      organizationName: ctx.input.organizationName,
      ownerId: ctx.input.ownerId,
      accountId: ctx.input.accountId,
      contactStageId: ctx.input.contactStageId,
      websiteUrl: ctx.input.websiteUrl,
      linkedinUrl: ctx.input.linkedinUrl,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      postalCode: ctx.input.postalCode,
      labelIds: ctx.input.labelIds,
      runDedupe: ctx.input.runDedupe
    });

    let contact = formatContact(result.contact);
    return {
      output: {
        contactId: contact.contactId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        title: contact.title,
        organizationName: contact.organizationName,
        createdAt: contact.createdAt
      },
      message: `Created contact **${contact.name || contact.email}** (ID: ${contact.contactId}).`
    };
  })
  .build();

export let bulkCreateContacts = SlateTool.create(spec, {
  name: 'Bulk Create Contacts',
  key: 'bulk_create_contacts',
  description:
    'Create up to 100 Apollo contacts in one request. Apollo returns created and existing contact records separately when deduplication finds matches.',
  constraints: ['Requires a master API key', 'Maximum 100 contacts per request'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(contactFieldsSchema)
        .describe('Contacts to create. Maximum 100 contacts.'),
      appendLabelNames: z
        .array(z.string())
        .optional()
        .describe('Label names to append to all contacts in this request'),
      runDedupe: z.boolean().optional().describe('Enable full deduplication')
    })
  )
  .output(
    z.object({
      createdContacts: z.array(contactOutputSchema),
      existingContacts: z.array(contactOutputSchema),
      createdCount: z.number(),
      existingCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.contacts.length === 0) {
      throw apolloServiceError('At least one contact is required.');
    }
    if (ctx.input.contacts.length > 100) {
      throw apolloServiceError('Bulk create contacts supports up to 100 contacts.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.bulkCreateContacts({
      contacts: ctx.input.contacts,
      appendLabelNames: ctx.input.appendLabelNames,
      runDedupe: ctx.input.runDedupe
    });
    let createdContacts = result.createdContacts.map(formatContact);
    let existingContacts = result.existingContacts.map(formatContact);

    return {
      output: {
        createdContacts,
        existingContacts,
        createdCount: createdContacts.length,
        existingCount: existingContacts.length
      },
      message: `Bulk contact create finished: **${createdContacts.length}** created, **${existingContacts.length}** existing.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in your Apollo account. Provide the contact ID and any fields you want to change. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z
      .object({
        contactId: z.string().describe('The Apollo contact ID to update')
      })
      .merge(contactFieldsSchema)
  )
  .output(
    z.object({
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      organizationName: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.updateContact(ctx.input.contactId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      title: ctx.input.title,
      phone: ctx.input.phone,
      organizationName: ctx.input.organizationName,
      ownerId: ctx.input.ownerId,
      accountId: ctx.input.accountId,
      contactStageId: ctx.input.contactStageId,
      websiteUrl: ctx.input.websiteUrl,
      linkedinUrl: ctx.input.linkedinUrl,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      postalCode: ctx.input.postalCode,
      labelIds: ctx.input.labelIds
    });

    let contact = formatContact(result.contact);
    return {
      output: {
        contactId: contact.contactId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        title: contact.title,
        organizationName: contact.organizationName,
        updatedAt: contact.updatedAt
      },
      message: `Updated contact **${contact.name || contact.email || contact.contactId}**.`
    };
  })
  .build();

export let bulkUpdateContacts = SlateTool.create(spec, {
  name: 'Bulk Update Contacts',
  key: 'bulk_update_contacts',
  description:
    'Update multiple Apollo contacts. Provide contactIds plus common update fields, or contacts with individual contactId-specific updates.',
  instructions: [
    'Use contactIds when applying the same fields to multiple contacts.',
    'Use contacts when each contact needs different update fields.'
  ],
  constraints: ['Requires a master API key', 'Maximum 100 contacts per synchronous request'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to update with the same common fields'),
      contacts: z
        .array(
          z
            .object({
              contactId: z.string().describe('Apollo contact ID to update')
            })
            .merge(contactFieldsSchema)
        )
        .optional()
        .describe('Contact-specific updates'),
      firstName: z
        .string()
        .optional()
        .describe('Common first name update for contactIds mode'),
      lastName: z.string().optional().describe('Common last name update for contactIds mode'),
      title: z.string().optional().describe('Common title update for contactIds mode'),
      ownerId: z.string().optional().describe('Common owner update for contactIds mode'),
      contactStageId: z
        .string()
        .optional()
        .describe('Common stage update for contactIds mode'),
      accountId: z
        .string()
        .optional()
        .describe('Common account association for contactIds mode'),
      async: z.boolean().optional().describe('Process asynchronously for larger updates')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      contactsUpdated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let hasContactIds = Boolean(ctx.input.contactIds?.length);
    let hasContacts = Boolean(ctx.input.contacts?.length);

    if (hasContactIds === hasContacts) {
      throw apolloServiceError('Provide either contactIds or contacts, but not both.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.bulkUpdateContacts({
      contactIds: ctx.input.contactIds,
      contactAttributes: ctx.input.contacts,
      updates: {
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        title: ctx.input.title,
        ownerId: ctx.input.ownerId,
        contactStageId: ctx.input.contactStageId,
        accountId: ctx.input.accountId
      },
      async: ctx.input.async
    });
    let contacts = result.contacts.map(formatContact);

    return {
      output: {
        contacts,
        contactsUpdated:
          contacts.length || ctx.input.contactIds?.length || ctx.input.contacts?.length || 0
      },
      message: `Bulk contact update submitted for **${ctx.input.contactIds?.length || ctx.input.contacts?.length || contacts.length}** contact(s).`
    };
  })
  .build();

export let updateContactStages = SlateTool.create(spec, {
  name: 'Update Contact Stages',
  key: 'update_contact_stages',
  description: 'Update the contact stage for one or more Apollo contacts.',
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIds: z.array(z.string()).describe('Apollo contact IDs to update'),
      contactStageId: z.string().describe('Apollo contact stage ID')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      contactsUpdated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.contactIds.length === 0) {
      throw apolloServiceError('At least one contact ID is required.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.updateContactStages(
      ctx.input.contactIds,
      ctx.input.contactStageId
    );
    let contacts = result.contacts.map(formatContact);

    return {
      output: {
        contacts,
        contactsUpdated: ctx.input.contactIds.length
      },
      message: `Updated stage for **${ctx.input.contactIds.length}** contact(s).`
    };
  })
  .build();

export let updateContactOwners = SlateTool.create(spec, {
  name: 'Update Contact Owners',
  key: 'update_contact_owners',
  description: 'Assign one or more Apollo contacts to a different owner user.',
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIds: z.array(z.string()).describe('Apollo contact IDs to assign'),
      ownerId: z.string().describe('Apollo user ID of the new contact owner')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      contactsUpdated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.contactIds.length === 0) {
      throw apolloServiceError('At least one contact ID is required.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.updateContactOwners(ctx.input.contactIds, ctx.input.ownerId);
    let contacts = result.contacts.map(formatContact);

    return {
      output: {
        contacts,
        contactsUpdated: ctx.input.contactIds.length
      },
      message: `Updated owner for **${ctx.input.contactIds.length}** contact(s).`
    };
  })
  .build();
