import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves a contact's full details by their ID, including email, phone, company association, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      name: z.string().describe('Full name'),
      email: z.string().nullable().describe('Primary email'),
      phone: z.string().nullable().describe('Phone number'),
      mobile: z.string().nullable().describe('Mobile number'),
      address: z.string().nullable().describe('Physical address'),
      jobTitle: z.string().nullable().describe('Job title'),
      companyId: z.number().nullable().describe('Associated company ID'),
      active: z.boolean().describe('Whether the contact is active'),
      language: z.string().nullable().describe('Language preference'),
      timezone: z.string().nullable().describe('Timezone'),
      tags: z.array(z.string()).describe('Contact tags'),
      customFields: z.record(z.string(), z.any()).describe('Custom field values'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        mobile: contact.mobile ?? null,
        address: contact.address ?? null,
        jobTitle: contact.job_title ?? null,
        companyId: contact.company_id ?? null,
        active: contact.active ?? true,
        language: contact.language ?? null,
        timezone: contact.time_zone ?? null,
        tags: contact.tags ?? [],
        customFields: contact.custom_fields ?? {},
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      },
      message: `Retrieved contact **${contact.name}** (ID: ${contact.id})`
    };
  })
  .build();
