import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactTool = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in AccuLynx. Provide name, company, address, email addresses, and phone numbers. The created contact can then be used to create jobs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      companyName: z.string().optional().describe('Company name'),
      contactType: z.string().optional().describe('Contact type classification'),
      street: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code'),
      country: z.string().optional().describe('Country'),
      emailAddresses: z
        .array(
          z.object({
            emailAddress: z.string().describe('Email address'),
            isPrimary: z.boolean().optional().describe('Whether this is the primary email')
          })
        )
        .optional()
        .describe('List of email addresses'),
      phoneNumbers: z
        .array(
          z.object({
            phoneNumber: z.string().describe('Phone number'),
            type: z.string().optional().describe('Phone type (e.g. Mobile, Home, Work)'),
            isPrimary: z.boolean().optional().describe('Whether this is the primary phone')
          })
        )
        .optional()
        .describe('List of phone numbers')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('The created contact object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let address =
      ctx.input.street ||
      ctx.input.city ||
      ctx.input.state ||
      ctx.input.zip ||
      ctx.input.country
        ? {
            street: ctx.input.street,
            city: ctx.input.city,
            state: ctx.input.state,
            zip: ctx.input.zip,
            country: ctx.input.country
          }
        : undefined;

    let contact = await client.createContact({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      companyName: ctx.input.companyName,
      contactType: ctx.input.contactType,
      address,
      emailAddresses: ctx.input.emailAddresses,
      phoneNumbers: ctx.input.phoneNumbers
    });

    let name =
      [ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') ||
      ctx.input.companyName ||
      'contact';

    return {
      output: { contact },
      message: `Created new contact **${name}**.`
    };
  })
  .build();
