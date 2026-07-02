import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Add Contact to List',
  key: 'create_contact',
  description: `Add a new contact to a specified list in your Mailercloud account. Contacts require an email address and must be assigned to a list. You can include standard fields like name, phone, city, and organization, as well as custom property fields.`,
  instructions: [
    'If the contact already exists, the API will return an "already exists" message.',
    'Custom fields must use the property encoded ID as the key (e.g., "enc_abc123").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact'),
      listId: z.string().describe('ID of the list to add the contact to'),
      name: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      middleName: z.string().optional().describe('Middle name of the contact'),
      city: z.string().optional().describe('City of the contact'),
      state: z.string().optional().describe('State of the contact'),
      zip: z.string().optional().describe('Zip/postal code of the contact'),
      country: z.string().optional().describe('Country of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      industry: z.string().optional().describe('Industry of the contact'),
      department: z.string().optional().describe('Department of the contact'),
      jobTitle: z.string().optional().describe('Job title of the contact'),
      organization: z.string().optional().describe('Organization of the contact'),
      leadSource: z.string().optional().describe('Lead source of the contact'),
      salary: z.number().optional().describe('Salary of the contact'),
      contactType: z.string().optional().describe('Contact type, defaults to "active"'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs where keys are property encoded IDs')
    })
  )
  .output(
    z
      .object({
        contactId: z.string().optional().describe('ID of the created contact'),
        email: z.string().optional().describe('Email of the created contact'),
        listId: z.string().optional().describe('ID of the list the contact was added to')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createContact({
      email: ctx.input.email,
      listId: ctx.input.listId,
      name: ctx.input.name,
      lastName: ctx.input.lastName,
      middleName: ctx.input.middleName,
      city: ctx.input.city,
      state: ctx.input.state,
      zip: ctx.input.zip,
      country: ctx.input.country,
      phone: ctx.input.phone,
      industry: ctx.input.industry,
      department: ctx.input.department,
      jobTitle: ctx.input.jobTitle,
      organization: ctx.input.organization,
      leadSource: ctx.input.leadSource,
      salary: ctx.input.salary,
      contactType: ctx.input.contactType,
      customFields: ctx.input.customFields as Record<string, string | number> | undefined
    });

    let data = result?.data ?? result;

    return {
      output: {
        contactId: data?.id ?? data?.enc_id ?? undefined,
        email: ctx.input.email,
        listId: ctx.input.listId,
        ...data
      },
      message: `Successfully added contact **${ctx.input.email}** to list \`${ctx.input.listId}\`.`
    };
  })
  .build();
