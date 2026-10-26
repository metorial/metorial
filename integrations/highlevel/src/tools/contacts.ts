import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const contactId = z
  .string()
  .min(1)
  .describe(
    'Contact ID. Use contacts_get_contacts to find contacts in the connected sub-account.'
  );
const nullableText = z.string().nullable().optional();
const dndChannel = z.object({
  status: z
    .enum(['active', 'inactive', 'permanent'])
    .describe('Whether this channel is blocked.'),
  message: z.string().optional().describe('Reason for the preference.'),
  code: z.string().optional().describe('Provider reason code.')
});
const contactFields = {
  firstName: nullableText.describe('First name; null clears the value.'),
  lastName: nullableText.describe('Last name; null clears the value.'),
  name: nullableText.describe('Full name; null clears the value.'),
  email: nullableText.describe(
    'Primary email address. Include the current primary email when changing additionalEmails.'
  ),
  phone: nullableText.describe(
    'Primary phone number. Include the current primary phone when changing additionalPhones.'
  ),
  address1: nullableText.describe('Street address; null clears the value.'),
  city: nullableText.describe('City; null clears the value.'),
  state: nullableText.describe('State or province; null clears the value.'),
  postalCode: z.string().optional().describe('Postal or ZIP code.'),
  website: nullableText.describe('Website URL; null clears the value.'),
  timezone: nullableText.describe('IANA timezone name; null clears the value.'),
  dnd: z.boolean().optional().describe('Enable or disable Do Not Disturb.'),
  inboundDndSettings: z
    .object({
      all: dndChannel
        .omit({ code: true })
        .extend({
          status: z.enum(['active', 'inactive']).describe('Inbound Do Not Disturb status.')
        })
        .optional()
        .describe('Inbound communication preference.')
    })
    .optional()
    .describe('Inbound Do Not Disturb settings.'),
  dndSettings: z
    .object({
      call: dndChannel.optional().describe('Call preference.'),
      email: dndChannel.optional().describe('Email preference.'),
      sms: dndChannel.optional().describe('SMS preference.'),
      whatsApp: dndChannel.optional().describe('WhatsApp preference.'),
      fb: dndChannel.optional().describe('Facebook preference.'),
      gmb: dndChannel.optional().describe('Google Business preference.')
    })
    .optional()
    .describe('Do Not Disturb preferences by channel.'),
  tags: z
    .array(z.string())
    .optional()
    .describe(
      'Complete replacement tag list. Use contacts_add_tags or contacts_remove_tags for incremental changes.'
    ),
  customFields: z
    .array(
      z.object({
        id: z
          .string()
          .optional()
          .describe('Custom field ID from locations_get_custom_fields; provide id or key.'),
        key: z.string().optional().describe('Custom field key; provide key or id.'),
        fieldValue: z
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.record(z.string(), z.unknown())
          ])
          .describe('Value matching the custom field type.')
      })
    )
    .optional()
    .describe('Custom field values to assign.'),
  dateOfBirth: nullableText.describe(
    'Birth date, preferably YYYY-MM-DD; null clears the value.'
  ),
  country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2 country code.')
};
const additionalAddresses = {
  additionalEmails: z
    .array(z.object({ email: z.string().email().describe('Secondary email address.') }))
    .max(10)
    .optional()
    .describe(
      'Secondary email addresses. Requires a non-empty primary email in the same request.'
    ),
  additionalPhones: z
    .array(
      z.object({
        phone: z.string().min(1).describe('Secondary phone number.'),
        phoneLabel: z
          .enum(['Home', 'Work', 'Mobile', 'Landline'])
          .optional()
          .describe(
            'Phone label; labels must be unique across primary and additional numbers.'
          )
      })
    )
    .max(10)
    .optional()
    .describe(
      'Secondary phone numbers. Requires a non-empty primary phone in the same request.'
    )
};
const createContactInput = z.object({
  ...contactFields,
  ...additionalAddresses,
  gender: z.string().optional().describe('Gender.'),
  companyName: nullableText.describe('Company name; null clears the value.'),
  source: z.string().optional().describe('Origin of this contact.'),
  assignedTo: z.string().optional().describe('Assigned HighLevel user ID.')
});
const updateContactInput = z.object({
  contactId,
  ...contactFields,
  ...additionalAddresses,
  source: nullableText.describe('Origin of this contact; null clears the value.'),
  assignedTo: nullableText.describe('Assigned HighLevel user ID; null clears the assignment.')
});
const upsertContactInput = createContactInput
  .omit({ additionalEmails: true, additionalPhones: true })
  .extend({
    createNewIfDuplicateAllowed: z
      .boolean()
      .optional()
      .describe(
        'Allow creating a duplicate when the sub-account duplicate-contact settings permit it.'
      )
  });
const contactRecord = z
  .object({
    id: z.string().min(1),
    locationId: z.string().optional(),
    name: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional(),
    firstNameLowerCase: z.string().nullable().optional(),
    lastNameLowerCase: z.string().nullable().optional(),
    searchAfter: z.array(z.union([z.string(), z.number()])).optional()
  })
  .passthrough();
const contactOutput = z.object({
  contactId: z.string().describe('Contact identifier.'),
  locationId: z.string().describe('Connected sub-account identifier.'),
  contact: contactRecord.describe(
    'Contact details, including IDs, names, addresses, tags, and timestamps when returned.'
  ),
  new: z
    .boolean()
    .optional()
    .describe('Whether an upsert created a new contact, when reported by HighLevel.'),
  succeeded: z.boolean().optional().describe('Provider update result, when reported.')
});
type ContactResponse = { contact?: unknown; new?: boolean; succeeded?: boolean };

function mapContact(
  response: ContactResponse,
  client: ReturnType<typeof createHighLevelClient>
) {
  if (response.succeeded === false)
    throw createApiServiceError(
      'HighLevel did not apply the contact update. Retrieve the contact before trying again.'
    );
  const parsed = contactRecord.safeParse(response.contact);
  if (!parsed.success)
    throw createApiServiceError(
      'HighLevel returned an invalid contact response. Retry the read before making further changes.'
    );
  client.assertLocation(parsed.data.locationId);
  return {
    contactId: parsed.data.id,
    locationId: client.locationId,
    contact: parsed.data,
    new: response.new,
    succeeded: response.succeeded
  };
}

function validateContactFields(
  input: Pick<
    z.infer<typeof createContactInput>,
    'additionalEmails' | 'additionalPhones' | 'email' | 'phone' | 'customFields'
  >
) {
  if (input.additionalEmails !== undefined && !input.email?.trim()) {
    throw createApiServiceError(
      'Include the current primary email when supplying additionalEmails to prevent losing the primary address.'
    );
  }
  if (input.additionalPhones !== undefined && !input.phone?.trim()) {
    throw createApiServiceError(
      'Include the current primary phone when supplying additionalPhones to prevent losing the primary number.'
    );
  }
  for (const field of input.customFields ?? []) {
    if (!field.id && !field.key)
      throw createApiServiceError(
        'Each custom field must include an id or key. Discover fields with locations_get_custom_fields.'
      );
  }
}

export const contactsGetContact = SlateTool.create(spec, {
  key: 'contacts_get_contact',
  name: 'Get Contact',
  description:
    'Retrieve a contact and its current details from the connected HighLevel sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('contacts.readonly'))
  .input(z.object({ contactId }))
  .output(contactOutput)
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<ContactResponse>({
      method: 'GET',
      path: `/contacts/${encodeURIComponent(ctx.input.contactId)}`,
      scope: 'contacts.readonly'
    });
    return { output: mapContact(response, client), message: 'Retrieved contact.' };
  })
  .build();

export const contactsCreateContact = SlateTool.create(spec, {
  key: 'contacts_create_contact',
  name: 'Create Contact',
  description: 'Create a contact in the connected HighLevel sub-account.',
  tags: { readOnly: false }
})
  .scopes(highLevelScope('contacts.write'))
  .input(createContactInput)
  .output(contactOutput)
  .handleInvocation(async ctx => {
    validateContactFields(ctx.input);
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<ContactResponse>({
      method: 'POST',
      path: '/contacts/',
      scope: 'contacts.write',
      body: { ...pickDefined(ctx.input), locationId: client.locationId }
    });
    return { output: mapContact(response, client), message: 'Created contact.' };
  })
  .build();

export const contactsUpdateContact = SlateTool.create(spec, {
  key: 'contacts_update_contact',
  name: 'Update Contact',
  description:
    'Update only supplied contact fields. A supplied tags list replaces existing tags; use the dedicated tag tools for incremental changes.',
  tags: { readOnly: false }
})
  .scopes(highLevelScope('contacts.write'))
  .input(updateContactInput)
  .output(contactOutput)
  .handleInvocation(async ctx => {
    const { contactId, ...fields } = ctx.input;
    validateContactFields(fields);
    const body = pickDefined(fields);
    if (Object.keys(body).length === 0)
      throw createApiServiceError('Provide at least one contact field to update.');
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<ContactResponse>({
      method: 'PUT',
      path: `/contacts/${encodeURIComponent(contactId)}`,
      scope: 'contacts.write',
      body
    });
    return { output: mapContact(response, client), message: 'Updated contact.' };
  })
  .build();

export const contactsUpsertContact = SlateTool.create(spec, {
  key: 'contacts_upsert_contact',
  name: 'Upsert Contact',
  description:
    'Create or update a contact according to the sub-account duplicate-contact settings and email/phone matching priority. Supplied tags replace the existing list.',
  tags: { readOnly: false }
})
  .scopes(highLevelScope('contacts.write'))
  .input(upsertContactInput)
  .output(contactOutput)
  .handleInvocation(async ctx => {
    validateContactFields(ctx.input);
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<ContactResponse>({
      method: 'POST',
      path: '/contacts/upsert',
      scope: 'contacts.write',
      body: { ...pickDefined(ctx.input), locationId: client.locationId }
    });
    return {
      output: mapContact(response, client),
      message: 'Upserted contact according to the sub-account duplicate-contact settings.'
    };
  })
  .build();

const tagsInput = z.object({
  contactId,
  tags: z
    .array(z.string().min(1))
    .min(1)
    .describe('Tag names to add or remove without replacing unrelated tags.')
});
const tagsOutput = z.object({
  contactId: z.string(),
  locationId: z.string(),
  tags: z.array(z.string()).describe('Current contact tags reported after the change.')
});
export const contactsAddTags = SlateTool.create(spec, {
  key: 'contacts_add_tags',
  name: 'Add Contact Tags',
  description: 'Add tags to a contact while preserving unrelated tags.',
  tags: { readOnly: false }
})
  .scopes(highLevelScope('contacts.write'))
  .input(tagsInput)
  .output(tagsOutput)
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<{ tags: string[] }>({
      method: 'POST',
      path: `/contacts/${encodeURIComponent(ctx.input.contactId)}/tags`,
      scope: 'contacts.write',
      body: { tags: ctx.input.tags }
    });
    return {
      output: {
        contactId: ctx.input.contactId,
        locationId: client.locationId,
        tags: response.tags
      },
      message: 'Added contact tags.'
    };
  })
  .build();
export const contactsRemoveTags = SlateTool.create(spec, {
  key: 'contacts_remove_tags',
  name: 'Remove Contact Tags',
  description: 'Remove the specified tags from a contact while preserving all other tags.',
  tags: { readOnly: false, destructive: true }
})
  .scopes(highLevelScope('contacts.write'))
  .input(tagsInput)
  .output(tagsOutput)
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<{ tags: string[] }>({
      method: 'DELETE',
      path: `/contacts/${encodeURIComponent(ctx.input.contactId)}/tags`,
      scope: 'contacts.write',
      body: { tags: ctx.input.tags }
    });
    return {
      output: {
        contactId: ctx.input.contactId,
        locationId: client.locationId,
        tags: response.tags
      },
      message: 'Removed contact tags.'
    };
  })
  .build();

const taskRecord = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    assignedTo: z.string().nullable().optional(),
    dueDate: z.string().optional(),
    completed: z.boolean().optional(),
    contactId: z.string().optional()
  })
  .passthrough();
export const contactsGetAllTasks = SlateTool.create(spec, {
  key: 'contacts_get_all_tasks',
  name: 'Get Contact Tasks',
  description:
    'Retrieve the tasks associated with a contact. HighLevel exposes no pagination for this endpoint.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('contacts.readonly'))
  .input(z.object({ contactId }))
  .output(
    z.object({
      contactId: z.string(),
      locationId: z.string(),
      tasks: z.array(taskRecord),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<{ tasks: z.infer<typeof taskRecord>[] }>({
      method: 'GET',
      path: `/contacts/${encodeURIComponent(ctx.input.contactId)}/tasks`,
      scope: 'contacts.readonly'
    });
    return {
      output: {
        contactId: ctx.input.contactId,
        locationId: client.locationId,
        tasks: response.tasks,
        count: response.tasks.length
      },
      message: `Retrieved ${response.tasks.length} contact tasks.`
    };
  })
  .build();

const searchFilter = z.object({
  field: z
    .string()
    .min(1)
    .describe('Search field, such as email, firstNameLowerCase, tags, or customFields.<id>.'),
  operator: z
    .enum(['eq', 'not_eq', 'contains', 'not_contains', 'exists', 'not_exists'])
    .describe(
      'Comparison operator. Email and website do not support contains/not_contains. Existence checks omit value.'
    ),
  value: z
    .union([z.string().max(75), z.number(), z.boolean(), z.array(z.string().max(75))])
    .optional()
    .describe(
      'Comparison value; omit for exists/not_exists. Use a value appropriate to the field.'
    )
});
const searchGroup = z.object({
  group: z.enum(['AND', 'OR']).describe('How to combine the filters in this group.'),
  filters: z.array(searchFilter).min(1).describe('Individual filters in this group.')
});
const contactSearchInput = z.object({
  query: z
    .string()
    .max(75)
    .optional()
    .describe(
      'Search text matched against fields configured as searchable in the sub-account.'
    ),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'One-based page number; omitted means the first page. Cannot be combined with searchAfter. Standard pages are limited to the first 10,000 records.'
    ),
  pageLimit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .default(20)
    .describe('Maximum contacts returned in one call, from 1 to 500.'),
  searchAfter: z
    .array(z.union([z.string(), z.number()]))
    .min(1)
    .optional()
    .describe(
      'Cursor returned as nextSearchAfter. Pass it unchanged with the same filters and sorting, and omit page.'
    ),
  filters: z
    .array(z.union([searchFilter, searchGroup]))
    .optional()
    .describe(
      'Individual filters or one level of AND/OR groups. Top-level entries are combined with AND.'
    ),
  sort: z
    .array(
      z.object({
        field: z
          .enum([
            'firstNameLowerCase',
            'lastNameLowerCase',
            'businessName',
            'dateAdded',
            'dateUpdated',
            'email',
            'dnd',
            'source',
            'lastActivity'
          ])
          .describe('Documented sortable contact field.'),
        direction: z.enum(['asc', 'desc']).describe('Sort direction.')
      })
    )
    .max(2)
    .optional()
    .describe('Up to two sorting rules, kept unchanged while following a cursor.')
});

export const contactsGetContacts = SlateTool.create(spec, {
  key: 'contacts_get_contacts',
  name: 'Search Contacts',
  description:
    'Search one bounded page of contacts in the connected sub-account. Changes may take a few seconds to appear. Continue with nextSearchAfter; page-number pagination stops at 10,000 records.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('contacts.readonly'))
  .input(contactSearchInput)
  .output(
    z.object({
      locationId: z.string(),
      contacts: z.array(contactRecord),
      count: z.number(),
      total: z.number().optional().describe('Total matching contacts reported by HighLevel.'),
      page: z
        .number()
        .optional()
        .describe('Requested page, only when page-number pagination was used.'),
      pageLimit: z.number(),
      nextPage: z
        .number()
        .optional()
        .describe('Next standard page when within the 10,000-record window.'),
      nextSearchAfter: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe(
          'Last returned contact cursor, passed unchanged to searchAfter for the next call.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    if (input.page !== undefined && input.searchAfter !== undefined)
      throw createApiServiceError('Use either page or searchAfter, never both.');
    const page = input.searchAfter === undefined ? (input.page ?? 1) : undefined;
    if (page !== undefined && page * input.pageLimit > 10000)
      throw createApiServiceError(
        'Standard contact pagination is limited to 10,000 records. Continue using nextSearchAfter instead.'
      );
    for (const entry of input.filters ?? []) {
      for (const filter of 'group' in entry ? entry.filters : [entry]) {
        const existence = filter.operator === 'exists' || filter.operator === 'not_exists';
        if (existence && filter.value !== undefined)
          throw createApiServiceError('Omit value for exists and not_exists filters.');
        if (!existence && filter.value === undefined)
          throw createApiServiceError(`Provide value for the ${filter.operator} filter.`);
        if (
          (filter.operator === 'contains' || filter.operator === 'not_contains') &&
          (typeof filter.value !== 'string' ||
            filter.field === 'email' ||
            filter.field === 'website')
        )
          throw createApiServiceError(
            'Contains filters require a string and are not supported for email or website. Use eq instead.'
          );
      }
    }
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<{ contacts: unknown[]; total?: number }>({
      method: 'POST',
      path: '/contacts/search',
      scope: 'contacts.readonly',
      body: { ...pickDefined(input), locationId: client.locationId }
    });
    if (!Array.isArray(response.contacts))
      throw createApiServiceError('HighLevel returned an invalid contact search response.');
    const contacts = response.contacts.map(contact => mapContact({ contact }, client).contact);
    const lastCursor = contacts.at(-1)?.searchAfter;
    const fullPage = contacts.length === input.pageLimit;
    const more =
      fullPage &&
      (page === undefined ||
        response.total === undefined ||
        page * input.pageLimit < response.total);
    return {
      output: {
        locationId: client.locationId,
        contacts,
        count: contacts.length,
        total: response.total,
        page,
        pageLimit: input.pageLimit,
        nextPage:
          more && page !== undefined && (page + 1) * input.pageLimit <= 10000
            ? page + 1
            : undefined,
        nextSearchAfter: more ? lastCursor : undefined
      },
      message: `Retrieved ${contacts.length} matching contacts.`
    };
  })
  .build();

export const contactsTools = [
  contactsGetContacts,
  contactsGetAllTasks,
  contactsAddTags,
  contactsRemoveTags,
  contactsGetContact,
  contactsUpdateContact,
  contactsUpsertContact,
  contactsCreateContact
];
