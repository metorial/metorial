import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      lastName: z.string().describe('Last name / surname'),
      firstName: z.string().optional().describe('First name'),
      title: z.string().optional().describe('Title or salutation, e.g. "Prof.", "Dr."'),
      companyName: z.string().optional().describe('Company name'),
      street: z.string().describe('Street address'),
      zip: z.string().describe('ZIP / postal code'),
      city: z.string().describe('City'),
      countryCode: z.string().optional().describe('Two-letter country code, e.g. "DE"')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the newly created contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      firstName: z.string().optional().describe('First name of the contact'),
      street: z.string().optional().describe('Street address'),
      zip: z.string().optional().describe('ZIP / postal code'),
      city: z.string().optional().describe('City')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info({
      message: 'Creating contact',
      lastName: ctx.input.lastName,
      city: ctx.input.city
    });

    let result = await client.createContact({
      name: ctx.input.lastName,
      first: ctx.input.firstName,
      title: ctx.input.title,
      company_name: ctx.input.companyName,
      street: ctx.input.street,
      zip: ctx.input.zip,
      city: ctx.input.city,
      country_code: ctx.input.countryCode
    });

    let contactId = result?.id?.toString();

    return {
      output: {
        contactId: contactId,
        lastName: result?.name,
        firstName: result?.first,
        street: result?.street,
        zip: result?.zip,
        city: result?.city
      },
      message: `Contact **${ctx.input.firstName ? `${ctx.input.firstName} ` : ''}${ctx.input.lastName}** created with ID \`${contactId}\`.`
    };
  })
  .build();
