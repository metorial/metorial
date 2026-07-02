import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in eTermin. Include personal details, address, and custom fields. Contacts can be associated with appointments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      salutation: z.string().optional().describe('Salutation (e.g. Mr., Mrs.)'),
      title: z.string().optional().describe('Title (e.g. Dr., Prof.)'),
      company: z.string().optional().describe('Company name'),
      street: z.string().optional().describe('Street address'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      country: z.string().optional().describe('Country'),
      birthday: z.string().optional().describe('Birthday'),
      customerNumber: z.string().optional().describe('Customer number'),
      newsletter: z.string().optional().describe('Set to "1" to subscribe to newsletter'),
      tags: z.string().optional().describe('Comma-separated tags'),
      additional1: z.string().optional().describe('Custom field 1'),
      additional2: z.string().optional().describe('Custom field 2'),
      additional3: z.string().optional().describe('Custom field 3'),
      additional4: z.string().optional().describe('Custom field 4'),
      additional5: z.string().optional().describe('Custom field 5')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the created contact details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.createContact({
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      salutation: ctx.input.salutation,
      title: ctx.input.title,
      company: ctx.input.company,
      street: ctx.input.street,
      zip: ctx.input.zip,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      birthday: ctx.input.birthday,
      customernumber: ctx.input.customerNumber,
      newsletter: ctx.input.newsletter,
      tags: ctx.input.tags,
      additional1: ctx.input.additional1,
      additional2: ctx.input.additional2,
      additional3: ctx.input.additional3,
      additional4: ctx.input.additional4,
      additional5: ctx.input.additional5
    });

    return {
      output: { result },
      message: `Contact created: **${ctx.input.firstName ?? ''} ${ctx.input.lastName ?? ''}**.`
    };
  })
  .build();
