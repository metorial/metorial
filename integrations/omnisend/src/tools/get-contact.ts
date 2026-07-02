import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by their Omnisend contact ID. Returns full contact details including subscription statuses, custom properties, tags, and identifiers.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('Omnisend contact ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Omnisend contact ID'),
      email: z.string().optional().describe('Contact email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.array(z.string()).optional().describe('Phone numbers'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      postalCode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      countryCode: z.string().optional().describe('ISO country code'),
      birthdate: z.string().optional().describe('Birthdate'),
      gender: z.string().optional().describe('Gender'),
      tags: z.array(z.string()).optional().describe('Contact tags'),
      customProperties: z.record(z.string(), z.any()).optional().describe('Custom properties'),
      identifiers: z
        .array(z.any())
        .optional()
        .describe('Contact identifiers with channel statuses'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);
    let result = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: result.contactID,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        phone: result.phone,
        address: result.address,
        city: result.city,
        state: result.state,
        postalCode: result.postalCode,
        country: result.country,
        countryCode: result.countryCode,
        birthdate: result.birthdate,
        gender: result.gender,
        tags: result.tags,
        customProperties: result.customProperties,
        identifiers: result.identifiers,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved contact **${result.email || result.contactID}**.`
    };
  })
  .build();
