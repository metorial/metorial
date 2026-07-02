import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalEmailAddresses, optionalString } from '../lib/output';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    countryOrRegion: z.string().optional(),
    postalCode: z.string().optional()
  })
  .optional();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve the full details of a specific contact by ID, including all email addresses, phone numbers, addresses, company information, and personal notes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      displayName: z.string().optional(),
      givenName: z.string().optional(),
      surname: z.string().optional(),
      emailAddresses: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      businessPhones: z.array(z.string()).optional(),
      homePhones: z.array(z.string()).optional(),
      mobilePhone: z.string().optional(),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      department: z.string().optional(),
      businessAddress: addressSchema,
      homeAddress: addressSchema,
      birthday: z.string().optional(),
      personalNotes: z.string().optional(),
      categories: z.array(z.string()).optional(),
      createdDateTime: z.string().optional(),
      lastModifiedDateTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: c.id,
        displayName: c.displayName,
        givenName: c.givenName,
        surname: c.surname,
        emailAddresses: optionalEmailAddresses(c.emailAddresses),
        businessPhones: c.businessPhones,
        homePhones: c.homePhones,
        mobilePhone: optionalString(c.mobilePhone),
        jobTitle: optionalString(c.jobTitle),
        companyName: optionalString(c.companyName),
        department: optionalString(c.department),
        businessAddress: c.businessAddress,
        homeAddress: c.homeAddress,
        birthday: optionalString(c.birthday),
        personalNotes: optionalString(c.personalNotes),
        categories: c.categories,
        createdDateTime: c.createdDateTime,
        lastModifiedDateTime: c.lastModifiedDateTime
      },
      message: `Retrieved contact **"${c.displayName || '(unnamed)'}"**.`
    };
  })
  .build();
