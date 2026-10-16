import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, resourceId } from '../lib/client';
import { spec } from '../spec';

const contactIdInput = z.object({
  contactId: z
    .string()
    .min(1)
    .describe('AMcards contact ID. Call search_contacts to discover IDs.')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve a contact’s full mailing address, personalization fields, and history. Call search_contacts to discover contact IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(contactIdInput)
  .output(
    z.object({
      contactId: z.string().describe('AMcards contact ID.'),
      rawResponse: z.any().describe('Complete contact returned by AMcards.')
    })
  )
  .handleInvocation(async ctx => {
    let contact = await new Client({ token: ctx.auth.token }).getContact(ctx.input.contactId);
    return {
      output: { contactId: resourceId(contact) ?? ctx.input.contactId, rawResponse: contact },
      message: 'Retrieved contact details.'
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description:
    'Create an AMcards contact with a mailing address and optional birthday, anniversary, and contact details. The authenticated account is resolved automatically.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      firstName: z.string().min(1).describe('Contact first name.'),
      lastName: z.string().min(1).describe('Contact last name.'),
      addressLine1: z.string().min(1).describe('Primary street address.'),
      city: z.string().min(1).describe('City.'),
      state: z.string().min(1).describe('State, province, or region.'),
      postalCode: z.string().min(1).describe('Postal or ZIP code.'),
      country: z.string().optional().describe('Country code, such as US.'),
      notes: z.string().optional().describe('Contact notes.'),
      email: z.string().optional().describe('Email address.'),
      organization: z.string().optional().describe('Organization or company.'),
      phone: z.string().optional().describe('Phone number as digits including country code.'),
      birthYear: z.string().optional().describe('Birth year in YYYY format.'),
      birthMonth: z.string().optional().describe('Birth month in MM format.'),
      birthDay: z.string().optional().describe('Birth day in DD format.'),
      anniversaryYear: z.string().optional().describe('Anniversary year in YYYY format.'),
      anniversaryMonth: z.string().optional().describe('Anniversary month in MM format.'),
      anniversaryDay: z.string().optional().describe('Anniversary day in DD format.')
    })
  )
  .output(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Created contact ID, when returned in the response or Location header.'),
      resourceUri: z
        .string()
        .optional()
        .describe('Created contact URI from the provider Location header, when returned.'),
      rawResponse: z
        .any()
        .optional()
        .describe(
          'Full response from the AMcards API. Successful creates may have an empty body.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createContact(ctx.input);
    return { output: result, message: 'AMcards accepted the contact creation request.' };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description:
    'Delete a contact from your AMcards account. Call search_contacts to discover its internal AMcards contact ID.',
  tags: { readOnly: false, destructive: true }
})
  .input(contactIdInput)
  .output(
    z.object({
      contactId: z.string().describe('ID of the deleted contact.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).deleteContact(
      ctx.input.contactId
    );
    return {
      output: { contactId: ctx.input.contactId, rawResponse: result },
      message: 'Contact deleted.'
    };
  })
  .build();
