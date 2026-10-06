import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, customFields, nonEmpty } from '../lib/client';
import { mapLead } from '../lib/models';
import { spec } from '../spec';

let contactSchema = z.object({
  name: z.string().optional().describe('Contact full name'),
  title: z.string().optional().describe('Contact job title'),
  emails: z
    .array(
      z.object({
        email: z.string().describe('Email address'),
        type: z.string().optional().describe('Email type (e.g. office, home, direct, other)')
      })
    )
    .optional()
    .describe('Contact email addresses, when provided'),
  phones: z
    .array(
      z.object({
        phone: z.string().describe('Phone number'),
        type: z
          .string()
          .optional()
          .describe('Phone type (e.g. office, mobile, home, direct, fax)')
      })
    )
    .optional()
    .describe('Contact phone numbers, when provided'),
  urls: z
    .array(
      z.object({
        url: z.string().describe('URL'),
        type: z
          .string()
          .optional()
          .describe('URL type (e.g. url, linkedin, twitter, facebook)')
      })
    )
    .optional()
    .describe('Contact URLs, when provided')
});

let addressSchema = z.object({
  address1: z.string().optional().describe('Street address line 1'),
  address2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or province'),
  zipcode: z.string().optional().describe('ZIP or postal code'),
  country: z.string().optional().describe('Country code (e.g. US, GB)')
});

let leadOutputSchema = z.object({
  leadId: z.string().describe('Unique lead ID'),
  name: z.string().optional().describe('Lead/company name, when set'),
  statusId: z.string().nullable().describe('Lead status ID'),
  statusLabel: z.string().nullable().describe('Lead status label'),
  url: z.string().nullable().describe('Lead company URL'),
  dateCreated: z.string().describe('Creation timestamp'),
  dateUpdated: z.string().describe('Last updated timestamp'),
  contacts: z
    .array(
      z.object({
        contactId: z.string(),
        name: z.string().nullable(),
        title: z.string().nullable(),
        emails: z.array(z.object({ email: z.string(), type: z.string() })).optional(),
        phones: z.array(z.object({ phone: z.string(), type: z.string() })).optional()
      })
    )
    .describe('Contacts associated with the lead'),
  displayName: z.string().optional().describe('Lead display name, when provided')
});

export let manageLeadTool = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Creates or updates a lead in Close CRM. If a leadId is provided, the existing lead is updated with the supplied fields. If no leadId is provided, a new lead is created. Supports setting contacts, addresses, and custom fields. Nested contacts are supported only during creation. Use Manage Contact to change contacts on an existing lead.`,
  instructions: [
    'Omit leadId to create a new lead. Provide leadId to update an existing lead.',
    'Custom fields should be passed in customFields as key-value pairs. Keys can be provided with or without the "custom." prefix.',
    'A name is recommended when creating a lead. Nested contacts are only supported during creation; use Manage Contact for contact updates.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      leadId: z.string().optional().describe('Lead ID to update. Omit to create a new lead.'),
      name: z.string().optional().describe('Lead/company name'),
      statusId: z.string().optional().describe('Lead status ID'),
      description: z.string().optional().describe('Lead description or notes'),
      url: z.string().optional().describe('Company website URL'),
      contacts: z
        .array(contactSchema)
        .optional()
        .describe('Initial contacts for a new lead. For existing leads, use Manage Contact.'),
      addresses: z
        .array(addressSchema)
        .optional()
        .describe('Physical addresses for the lead, when provided'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom field values as key-value pairs (keys with or without "custom." prefix)'
        )
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const input = ctx.input;
    if (input.leadId !== undefined && input.contacts !== undefined)
      throw createApiServiceError(
        'Nested contacts cannot be updated through a lead. Use Manage Contact with the contact ID instead.'
      );
    if (input.name !== undefined) nonEmpty(input.name, 'name');
    const payload = pickDefined({
      name: input.name,
      status_id: input.statusId,
      description: input.description,
      url: input.url,
      contacts: input.contacts?.map(c =>
        pickDefined({
          name: c.name,
          title: c.title,
          emails: c.emails,
          phones: c.phones,
          urls: c.urls
        })
      ),
      addresses: input.addresses?.map(a =>
        pickDefined({
          address_1: a.address1,
          address_2: a.address2,
          city: a.city,
          state: a.state,
          zipcode: a.zipcode,
          country: a.country
        })
      ),
      ...customFields(input.customFields)
    });
    const lead =
      input.leadId !== undefined
        ? await client.updateLead(input.leadId, payload)
        : await client.createLead(payload);
    return {
      output: mapLead(lead),
      message: `${input.leadId !== undefined ? 'Updated' : 'Created'} lead **${lead.id}**.`
    };
  })
  .build();
