import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, contactBody } from '../lib/client';
import { contactFields, contactOutput, mapContact } from '../lib/schemas';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new recipient contact in your EchtPost account. The contact can then be referenced by ID when sending postcards, avoiding the need to provide address details each time.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ...contactFields,
      lastName: z.string().describe('Last name / surname'),
      firstName: z.string().optional().describe('First name'),
      title: z.string().optional().describe('Title or salutation, e.g. "Prof.", "Dr."'),
      companyName: z.string().optional().describe('Company name'),
      street: z.string().describe('Street address'),
      zip: z.string().describe('ZIP / postal code'),
      city: z.string().describe('City'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code, e.g. "DE"; required by the current API')
    })
  )
  .output(contactOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.save('POST', '/contacts', contactBody(ctx.input));
    let output = mapContact(result);

    return {
      output,
      message: `Contact created with ID \`${output.contactId}\`.`
    };
  })
  .build();
