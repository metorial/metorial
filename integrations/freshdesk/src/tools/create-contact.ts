import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact in Freshdesk. Contacts represent customers who submit support tickets. Supports email, phone, company association, tags, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the contact'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      twitterId: z.string().optional().describe('Twitter handle'),
      address: z.string().optional().describe('Physical address'),
      companyId: z.number().optional().describe('ID of the associated company'),
      description: z.string().optional().describe('Description/bio of the contact'),
      jobTitle: z.string().optional().describe('Job title'),
      language: z.string().optional().describe('Language preference (e.g., "en")'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone (e.g., "Eastern Time (US & Canada)")'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the contact'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      name: z.string().describe('Name of the contact'),
      email: z.string().nullable().describe('Email address'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let contactData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.email) contactData.email = ctx.input.email;
    if (ctx.input.phone) contactData.phone = ctx.input.phone;
    if (ctx.input.mobile) contactData.mobile = ctx.input.mobile;
    if (ctx.input.twitterId) contactData.twitter_id = ctx.input.twitterId;
    if (ctx.input.address) contactData.address = ctx.input.address;
    if (ctx.input.companyId) contactData.company_id = ctx.input.companyId;
    if (ctx.input.description) contactData.description = ctx.input.description;
    if (ctx.input.jobTitle) contactData.job_title = ctx.input.jobTitle;
    if (ctx.input.language) contactData.language = ctx.input.language;
    if (ctx.input.timezone) contactData.time_zone = ctx.input.timezone;
    if (ctx.input.tags) contactData.tags = ctx.input.tags;
    if (ctx.input.customFields) contactData.custom_fields = ctx.input.customFields;

    let contact = await client.createContact(contactData);

    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        createdAt: contact.created_at
      },
      message: `Created contact **${contact.name}** (ID: ${contact.id})`
    };
  })
  .build();
