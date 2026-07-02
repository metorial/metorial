import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique contact identifier'),
  email: z.string().describe('Contact email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  phone: z.string().optional().describe('Phone number'),
  city: z.string().optional().describe('City'),
  stateProvinceRegion: z.string().optional().describe('State or province'),
  country: z.string().optional().describe('Country'),
  postalCode: z.string().optional().describe('Postal code'),
  customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let upsertContacts = SlateTool.create(spec, {
  name: 'Upsert Contacts',
  key: 'upsert_contacts',
  description: `Add or update marketing contacts. Contacts are matched by email address — existing contacts are updated, new ones are created. Supports custom fields and list assignment.`,
  instructions: [
    'Email is the unique identifier for contacts. Providing an existing email will update that contact.',
    'Custom field IDs must match fields configured in your SendGrid account.'
  ],
  constraints: [
    'Up to 30,000 contacts per request.',
    'Contact upsert is asynchronous — the job ID can be used to check import status.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('Contact email address (unique identifier)'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            phone: z.string().optional().describe('Phone number'),
            addressLine1: z.string().optional().describe('Address line 1'),
            addressLine2: z.string().optional().describe('Address line 2'),
            city: z.string().optional().describe('City'),
            stateProvinceRegion: z.string().optional().describe('State, province, or region'),
            postalCode: z.string().optional().describe('Postal/ZIP code'),
            country: z.string().optional().describe('Country'),
            alternateEmails: z
              .array(z.string())
              .optional()
              .describe('Alternate email addresses'),
            customFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom field values (field_id → value)')
          })
        )
        .min(1)
        .describe('Contacts to add or update')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking import status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.upsertContacts(ctx.input.contacts);

    return {
      output: {
        jobId: result.job_id
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) for upsert. Job ID: \`${result.job_id}\`.`
    };
  });

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search marketing contacts using SendGrid's SGQL (SendGrid Query Language). Returns matching contacts with their full profile data. Use this to find contacts by email, name, or custom fields.`,
  instructions: [
    "Use SGQL syntax, e.g.: `email LIKE '%@example.com'`, `first_name = 'John'`, or combine with AND/OR.",
    "Custom fields use their field ID: `custom_field_id = 'value'`."
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          "SGQL query string (e.g. \"email LIKE '%@example.com' AND first_name = 'John'\")"
        )
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('Matching contacts'),
      contactCount: z.number().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.searchContacts(ctx.input.query);

    let contacts = (result.result || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone_number,
      city: c.city,
      stateProvinceRegion: c.state_province_region,
      country: c.country,
      postalCode: c.postal_code,
      customFields: c.custom_fields,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: {
        contacts,
        contactCount: result.contact_count || contacts.length
      },
      message: `Found **${contacts.length}** contact(s) matching the query.`
    };
  });

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single marketing contact by ID. Returns the full contact profile including custom fields.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to retrieve')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let c = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: c.id,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone_number,
        city: c.city,
        stateProvinceRegion: c.state_province_region,
        country: c.country,
        postalCode: c.postal_code,
        customFields: c.custom_fields,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Retrieved contact **${c.email}** (\`${c.id}\`).`
    };
  });

export let deleteContacts = SlateTool.create(spec, {
  name: 'Delete Contacts',
  key: 'delete_contacts',
  description: `Delete marketing contacts by ID, or delete all contacts in the account. Deletion is asynchronous.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      contactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to delete. Omit to delete all contacts.'),
      deleteAll: z
        .boolean()
        .optional()
        .describe('Set to true to delete ALL contacts in the account')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.deleteContacts(ctx.input.contactIds || [], ctx.input.deleteAll);

    return {
      output: {
        jobId: result.job_id
      },
      message: ctx.input.deleteAll
        ? `Submitted deletion of **all contacts**. Job ID: \`${result.job_id}\`.`
        : `Submitted deletion of **${(ctx.input.contactIds || []).length}** contact(s). Job ID: \`${result.job_id}\`.`
    };
  });
