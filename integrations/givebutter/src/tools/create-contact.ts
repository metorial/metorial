import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new donor/supporter contact. Givebutter automatically deduplicates contacts with the same first name, last name, and email or phone. Use **forceCreate** to bypass deduplication.`,
  instructions: [
    'If address fields are provided, all required address fields (address1, city, state, zipcode, country) must have values. Incomplete addresses will be discarded.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name'),
      middleName: z.string().optional().describe('Middle name'),
      lastName: z.string().optional().describe('Last name'),
      emails: z
        .array(
          z.object({
            type: z.string().optional().describe('Email type (e.g. "personal", "work")'),
            value: z.string().describe('Email address')
          })
        )
        .optional()
        .describe('Email addresses'),
      phones: z
        .array(
          z.object({
            type: z.string().optional().describe('Phone type (e.g. "mobile", "home")'),
            value: z.string().describe('Phone number')
          })
        )
        .optional()
        .describe('Phone numbers'),
      addresses: z
        .array(
          z.object({
            address1: z.string().optional().describe('Street address'),
            address2: z.string().optional().describe('Address line 2'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            zipcode: z.string().optional().describe('ZIP/postal code'),
            country: z.string().optional().describe('Country')
          })
        )
        .optional()
        .describe('Addresses'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      dob: z.string().optional().describe('Date of birth (ISO 8601)'),
      company: z.string().optional().describe('Company name'),
      title: z.string().optional().describe('Title/position'),
      twitterUrl: z.string().optional().describe('Twitter URL'),
      linkedinUrl: z.string().optional().describe('LinkedIn URL'),
      facebookUrl: z.string().optional().describe('Facebook URL'),
      forceCreate: z.boolean().optional().describe('Force create even if a duplicate exists')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email'),
      primaryPhone: z.string().nullable().describe('Primary phone'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let addresses = ctx.input.addresses?.map(a => ({
      address_1: a.address1,
      address_2: a.address2,
      city: a.city,
      state: a.state,
      zipcode: a.zipcode,
      country: a.country
    }));

    let c = await client.createContact({
      first_name: ctx.input.firstName,
      middle_name: ctx.input.middleName,
      last_name: ctx.input.lastName,
      emails: ctx.input.emails,
      phones: ctx.input.phones,
      addresses,
      tags: ctx.input.tags,
      dob: ctx.input.dob,
      company: ctx.input.company,
      title: ctx.input.title,
      twitter_url: ctx.input.twitterUrl,
      linkedin_url: ctx.input.linkedinUrl,
      facebook_url: ctx.input.facebookUrl,
      force_create: ctx.input.forceCreate
    });

    return {
      output: {
        contactId: c.id,
        firstName: c.first_name ?? null,
        lastName: c.last_name ?? null,
        primaryEmail: c.primary_email ?? null,
        primaryPhone: c.primary_phone ?? null,
        createdAt: c.created_at ?? null
      },
      message: `Created contact **${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id}**.`
    };
  })
  .build();
