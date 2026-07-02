import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in CalendarHero. Contacts can be used for meeting requests and will be enriched with insights automatically by CalendarHero.`
})
  .input(
    z.object({
      name: z.string().describe('Full name of the contact'),
      title: z.string().optional().describe('Job title of the contact'),
      organization: z.string().optional().describe('Company or organization name'),
      emails: z.array(z.string()).optional().describe('Email addresses for the contact'),
      phoneNumbers: z.array(z.string()).optional().describe('Phone numbers for the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Created contact ID'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Primary email'),
      raw: z.any().optional().describe('Full contact response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createContact({
      name: ctx.input.name,
      title: ctx.input.title,
      organization: ctx.input.organization,
      email: ctx.input.emails,
      telephone: ctx.input.phoneNumbers
    });

    return {
      output: {
        contactId: result?._id || result?.id,
        name: result?.name || ctx.input.name,
        email: Array.isArray(result?.email) ? result.email[0] : result?.email,
        raw: result
      },
      message: `Contact **${ctx.input.name}** created.`
    };
  })
  .build();
