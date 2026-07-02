import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  countryOrRegion: z.string().optional(),
  postalCode: z.string().optional()
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in the authenticated user's contact book. Supports all standard contact fields including name, email, phone numbers, company info, and addresses. Optionally specify a contact folder.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      givenName: z.string().optional().describe('First name'),
      surname: z.string().optional().describe('Last name'),
      displayName: z
        .string()
        .optional()
        .describe('Display name (auto-generated from given/surname if omitted)'),
      emailAddresses: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Email addresses'),
      businessPhones: z.array(z.string()).optional().describe('Business phone numbers'),
      homePhones: z.array(z.string()).optional().describe('Home phone numbers'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      department: z.string().optional(),
      businessAddress: addressSchema.optional(),
      homeAddress: addressSchema.optional(),
      birthday: z.string().optional().describe('Birthday in ISO 8601 date format'),
      personalNotes: z.string().optional(),
      categories: z.array(z.string()).optional(),
      folderId: z
        .string()
        .optional()
        .describe('Contact folder ID. Omit to use the default folder.')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      displayName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.createContact(ctx.input);

    return {
      output: {
        contactId: contact.id,
        displayName: contact.displayName
      },
      message: `Created contact **"${contact.displayName || '(unnamed)'}"**.`
    };
  })
  .build();
