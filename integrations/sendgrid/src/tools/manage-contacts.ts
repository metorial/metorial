import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Contacts to add or update'),
      listIds: z
        .array(z.string())
        .optional()
        .describe('SendGrid Marketing list IDs to add these contacts to')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking import status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.upsertContacts(ctx.input.contacts, ctx.input.listIds);

    return {
      output: {
        jobId: result.job_id
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) for upsert${ctx.input.listIds?.length ? ` into **${ctx.input.listIds.length}** list(s)` : ''}. Job ID: \`${result.job_id}\`.`
    };
  });

export let getContactImportStatus = SlateTool.create(spec, {
  name: 'Get Contact Import Status',
  key: 'get_contact_import_status',
  description: `Check the asynchronous job status returned by contact upsert, contact import, or contact deletion operations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID returned by a contact upsert or deletion tool')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Contact import/delete job ID'),
      status: z.string().describe('Job status such as pending, completed, errored, or failed'),
      results: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider job result details'),
      errorsUrl: z.string().optional().describe('URL with detailed import errors if provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getContactImportStatus(ctx.input.jobId);

    return {
      output: {
        jobId: result.id || ctx.input.jobId,
        status: result.status,
        results: result.results,
        errorsUrl: result.errors_url
      },
      message: `Contact job \`${ctx.input.jobId}\` is **${result.status}**.`
    };
  });

export let getContactCount = SlateTool.create(spec, {
  name: 'Get Contact Count',
  key: 'get_contact_count',
  description: `Retrieve the total marketing contact count for the SendGrid account, including billable contact count when available.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      contactCount: z.number().describe('Total number of marketing contacts'),
      billableCount: z.number().optional().describe('Billable contact count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getContactCount();

    return {
      output: {
        contactCount: result.contact_count || 0,
        billableCount: result.billable_count
      },
      message: `SendGrid has **${result.contact_count || 0}** marketing contact(s).`
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
    if (!ctx.input.deleteAll && (!ctx.input.contactIds || ctx.input.contactIds.length === 0)) {
      throw createApiServiceError(
        'Provide contactIds or set deleteAll to true when deleting contacts.'
      );
    }

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
