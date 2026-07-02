import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let createParty = SlateTool.create(spec, {
  name: 'Create Party',
  key: 'create_party',
  description: `Create a new contact (person or organisation) in Capsule CRM. Supports setting names, email addresses, phone numbers, addresses, websites, tags, and custom fields.`,
  instructions: [
    'Set type to "person" for individuals or "organisation" for companies.',
    'For persons, link to an organisation using the organisation field with either an existing organisation ID or a name to create a new one.'
  ]
})
  .input(
    z.object({
      type: z.enum(['person', 'organisation']).describe('Type of contact to create'),
      firstName: z.string().optional().describe('First name (required for persons)'),
      lastName: z.string().optional().describe('Last name (required for persons)'),
      name: z.string().optional().describe('Organisation name (required for organisations)'),
      title: z.string().optional().describe('Title prefix (e.g. Mr, Mrs, Dr)'),
      jobTitle: z.string().optional().describe('Job title'),
      about: z.string().optional().describe('Description or notes about the contact'),
      organisation: z
        .object({
          organisationId: z
            .number()
            .optional()
            .describe('ID of an existing organisation to link'),
          name: z.string().optional().describe('Name of a new organisation to create and link')
        })
        .optional()
        .describe('Organisation to associate with a person'),
      ownerId: z.number().optional().describe('User ID of the owner'),
      teamId: z.number().optional().describe('Team ID to assign'),
      emailAddresses: z
        .array(
          z.object({
            type: z.string().optional().describe('Type: Home, Work'),
            address: z.string().describe('Email address')
          })
        )
        .optional()
        .describe('Email addresses to add'),
      phoneNumbers: z
        .array(
          z.object({
            type: z.string().optional().describe('Type: Home, Work, Mobile, Fax, Direct'),
            number: z.string().describe('Phone number')
          })
        )
        .optional()
        .describe('Phone numbers to add'),
      addresses: z
        .array(
          z.object({
            type: z.string().optional().describe('Type: Home, Postal, Office'),
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional()
          })
        )
        .optional()
        .describe('Addresses to add'),
      websites: z
        .array(
          z.object({
            type: z
              .string()
              .optional()
              .describe('Type: Home, Work, URL, Twitter, Linked_in, Facebook'),
            address: z.string().describe('Website URL or handle')
          })
        )
        .optional()
        .describe('Websites or social profiles to add'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional().describe('ID of existing tag'),
            name: z.string().optional().describe('Name of tag (creates if not existing)')
          })
        )
        .optional()
        .describe('Tags to associate')
    })
  )
  .output(
    z.object({
      partyId: z.number().describe('ID of the created party'),
      type: z.string().describe('Type of the created party'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      name: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let party: Record<string, any> = {
      type: ctx.input.type
    };

    if (ctx.input.type === 'person') {
      if (ctx.input.firstName) party.firstName = ctx.input.firstName;
      if (ctx.input.lastName) party.lastName = ctx.input.lastName;
      if (ctx.input.title) party.title = ctx.input.title;
      if (ctx.input.jobTitle) party.jobTitle = ctx.input.jobTitle;
    } else if (ctx.input.name) party.name = ctx.input.name;

    if (ctx.input.about) party.about = ctx.input.about;

    if (ctx.input.organisation) {
      let org: Record<string, any> = {};
      if (ctx.input.organisation.organisationId)
        org.id = ctx.input.organisation.organisationId;
      if (ctx.input.organisation.name) org.name = ctx.input.organisation.name;
      party.organisation = org;
    }

    if (ctx.input.ownerId) party.owner = { id: ctx.input.ownerId };
    if (ctx.input.teamId) party.team = { id: ctx.input.teamId };
    if (ctx.input.emailAddresses) party.emailAddresses = ctx.input.emailAddresses;
    if (ctx.input.phoneNumbers) party.phoneNumbers = ctx.input.phoneNumbers;
    if (ctx.input.addresses) party.addresses = ctx.input.addresses;
    if (ctx.input.websites) party.websites = ctx.input.websites;

    if (ctx.input.tags) {
      party.tags = ctx.input.tags.map(t => {
        if (t.tagId) return { id: t.tagId };
        return { name: t.name };
      });
    }

    let result = await client.createParty(party);

    let displayName =
      result.type === 'person'
        ? `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim()
        : (result.name ?? `Party #${result.id}`);

    return {
      output: {
        partyId: result.id,
        type: result.type,
        firstName: result.firstName,
        lastName: result.lastName,
        name: result.name,
        createdAt: result.createdAt
      },
      message: `Created ${result.type} **${displayName}** (ID: ${result.id}).`
    };
  })
  .build();
