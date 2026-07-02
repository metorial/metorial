import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    .describe('Contact email addresses'),
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
    .describe('Contact phone numbers'),
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
    .describe('Contact URLs')
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
  name: z.string().describe('Lead/company name'),
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
        emails: z.array(z.object({ email: z.string(), type: z.string() })),
        phones: z.array(z.object({ phone: z.string(), type: z.string() }))
      })
    )
    .describe('Contacts associated with the lead'),
  displayName: z.string().describe('Lead display name')
});

let mapLeadToOutput = (lead: any) => ({
  leadId: lead.id,
  name: lead.name || lead.display_name || '',
  statusId: lead.status_id || null,
  statusLabel: lead.status_label || null,
  url: lead.url || null,
  dateCreated: lead.date_created || '',
  dateUpdated: lead.date_updated || '',
  contacts: (lead.contacts || []).map((c: any) => ({
    contactId: c.id,
    name: c.name || null,
    title: c.title || null,
    emails: (c.emails || []).map((e: any) => ({
      email: e.email || '',
      type: e.type || 'office'
    })),
    phones: (c.phones || []).map((p: any) => ({
      phone: p.phone || '',
      type: p.type || 'office'
    }))
  })),
  displayName: lead.display_name || lead.name || ''
});

let buildLeadPayload = (input: any) => {
  let payload: Record<string, any> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.statusId !== undefined) payload.status_id = input.statusId;
  if (input.description !== undefined) payload.description = input.description;
  if (input.url !== undefined) payload.url = input.url;

  if (input.contacts !== undefined) {
    payload.contacts = input.contacts.map((c: any) => {
      let contact: Record<string, any> = {};
      if (c.name !== undefined) contact.name = c.name;
      if (c.title !== undefined) contact.title = c.title;
      if (c.emails !== undefined) {
        contact.emails = c.emails.map((e: any) => ({
          email: e.email,
          type: e.type || 'office'
        }));
      }
      if (c.phones !== undefined) {
        contact.phones = c.phones.map((p: any) => ({
          phone: p.phone,
          type: p.type || 'office'
        }));
      }
      if (c.urls !== undefined) {
        contact.urls = c.urls.map((u: any) => ({
          url: u.url,
          type: u.type || 'url'
        }));
      }
      return contact;
    });
  }

  if (input.addresses !== undefined) {
    payload.addresses = input.addresses.map((a: any) => {
      let address: Record<string, any> = {};
      if (a.address1 !== undefined) address.address_1 = a.address1;
      if (a.address2 !== undefined) address.address_2 = a.address2;
      if (a.city !== undefined) address.city = a.city;
      if (a.state !== undefined) address.state = a.state;
      if (a.zipcode !== undefined) address.zipcode = a.zipcode;
      if (a.country !== undefined) address.country = a.country;
      return address;
    });
  }

  if (input.customFields !== undefined) {
    for (let [key, value] of Object.entries(input.customFields)) {
      let fieldKey = key.startsWith('custom.') ? key : `custom.${key}`;
      payload[fieldKey] = value;
    }
  }

  return payload;
};

export let manageLeadTool = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Creates or updates a lead in Close CRM. If a leadId is provided, the existing lead is updated with the supplied fields. If no leadId is provided, a new lead is created. Supports setting contacts, addresses, and custom fields.`,
  instructions: [
    'Omit leadId to create a new lead. Provide leadId to update an existing lead.',
    'Custom fields should be passed in customFields as key-value pairs. Keys can be provided with or without the "custom." prefix.',
    'When creating a lead, at minimum provide a name.'
  ],
  tags: {
    readOnly: false
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
        .describe('Contacts to associate with the lead'),
      addresses: z.array(addressSchema).optional().describe('Physical addresses for the lead'),
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
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let payload = buildLeadPayload(ctx.input);
    let lead: any;

    if (ctx.input.leadId) {
      lead = await client.updateLead(ctx.input.leadId, payload);
    } else {
      lead = await client.createLead(payload);
    }

    let isUpdate = !!ctx.input.leadId;
    let action = isUpdate ? 'Updated' : 'Created';

    return {
      output: mapLeadToOutput(lead),
      message: `${action} lead **${lead.display_name || lead.name || lead.id}**`
    };
  })
  .build();
