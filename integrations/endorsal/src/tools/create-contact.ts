import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in your Endorsal CRM for requesting testimonials. You must provide either an email or phone number. Optionally enroll the contact into an AutoRequest campaign.`,
  instructions: [
    'At least one of email or phone is required.',
    'If campaignId is provided, the contact will be enrolled in the specified AutoRequest campaign.'
  ]
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      name: z.string().optional().describe('Contact full name'),
      company: z.string().optional().describe('Contact company name'),
      position: z.string().optional().describe('Contact job title or role'),
      location: z.string().optional().describe('Contact geographic location'),
      website: z.string().optional().describe('Contact website URL'),
      avatar: z.string().optional().describe('URL to a publicly accessible avatar image'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier from the source platform'),
      importedFrom: z.string().optional().describe('Name of the originating platform'),
      propertyId: z.string().optional().describe('The Endorsal property ID'),
      campaignId: z
        .string()
        .optional()
        .describe('AutoRequest campaign ID to enroll the contact in'),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom key-value attributes for the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the newly created contact'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      name: z.string().optional().describe('Contact full name'),
      company: z.string().optional().describe('Contact company name'),
      added: z.number().optional().describe('Timestamp when contact was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.email && !ctx.input.phone) {
      throw new Error('You must provide either an email or phone number.');
    }

    let contact = await client.createContact(
      {
        email: ctx.input.email,
        phone: ctx.input.phone,
        name: ctx.input.name,
        company: ctx.input.company,
        position: ctx.input.position,
        location: ctx.input.location,
        website: ctx.input.website,
        avatar: ctx.input.avatar,
        externalID: ctx.input.externalId,
        importedFrom: ctx.input.importedFrom,
        propertyID: ctx.input.propertyId,
        customAttributes: ctx.input.customAttributes
      },
      {
        campaignID: ctx.input.campaignId
      }
    );

    return {
      output: {
        contactId: contact._id,
        email: contact.email,
        phone: contact.phone,
        name: contact.name,
        company: contact.company,
        added: contact.added
      },
      message: `Created contact **${contact.name || contact.email || contact._id}**${ctx.input.campaignId ? ' and enrolled in campaign' : ''}.`
    };
  })
  .build();
