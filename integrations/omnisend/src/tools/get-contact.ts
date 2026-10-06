import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by its provider ID, including available subscription identifiers, personal details, tags and custom properties.`,
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
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.getContact(ctx.input.contactId);
    return { output, message: 'Retrieved contact.' };
  })
  .build();
