import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Magnetic. If a matching contact already exists, the data will be appended to the existing record. A company can be associated with the contact.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      mobile: z.string().optional().describe('Mobile phone number of the contact'),
      position: z.string().optional().describe('Job title or position of the contact'),
      companyId: z
        .string()
        .optional()
        .describe('ID of an existing company to associate with this contact'),
      companyName: z
        .string()
        .optional()
        .describe(
          'Name of the company. Used if companyId is not provided to create or match a company.'
        ),
      address: z.string().optional().describe('Physical address of the contact'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or region'),
      postcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('Country'),
      tags: z.string().optional().describe('Comma-separated tags to assign to the contact'),
      externalRef: z
        .string()
        .optional()
        .describe('External reference identifier for the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created or updated contact'),
      fullName: z.string().optional().describe('Full name of the contact'),
      email: z.string().optional().describe('Email address of the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      mobile: ctx.input.mobile,
      position: ctx.input.position,
      address: ctx.input.address,
      city: ctx.input.city,
      state: ctx.input.state,
      postcode: ctx.input.postcode,
      country: ctx.input.country,
      tags: ctx.input.tags,
      externalRef: ctx.input.externalRef
    };

    if (ctx.input.companyId) {
      data.company = { id: ctx.input.companyId };
      data.contactCompany = { id: ctx.input.companyId };
    } else if (ctx.input.companyName) {
      data.company = { name: ctx.input.companyName };
      data.contactCompany = { name: ctx.input.companyName };
    }

    let response = await client.createContact(data);

    return {
      output: {
        contactId: String(response.id),
        fullName: response.fullName,
        email: response.email
      },
      message: `Created contact **${response.fullName || ctx.input.firstName}** (ID: ${response.id}).`
    };
  })
  .build();
