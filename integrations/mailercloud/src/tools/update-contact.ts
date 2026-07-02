import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information in your Mailercloud account. You can modify standard fields like name, phone, city, and organization, as well as custom property fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
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
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs where keys are property encoded IDs')
    })
  )
  .output(
    z
      .object({
        contactId: z.string().optional().describe('ID of the updated contact')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateContact(ctx.input.contactId, {
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
      customFields: ctx.input.customFields as Record<string, string | number> | undefined
    });

    let data = result?.data ?? result;

    return {
      output: {
        contactId: ctx.input.contactId,
        ...data
      },
      message: `Successfully updated contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
