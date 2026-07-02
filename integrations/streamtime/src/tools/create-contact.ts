import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact under an existing company in Streamtime. Contacts can be linked to jobs and invoices.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to add the contact to'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      email: z.string().optional().describe('Contact email address'),
      phoneNumber: z.string().optional().describe('Contact phone number'),
      position: z.string().optional().describe('Job title / position')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the newly created contact'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      raw: z.record(z.string(), z.any()).describe('Full contact object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) body.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.position !== undefined) body.position = ctx.input.position;

    let result = await client.createContact(ctx.input.companyId, body);

    return {
      output: {
        contactId: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        raw: result
      },
      message: `Created contact **${result.firstName} ${result.lastName}** (ID: ${result.id}) under company ${ctx.input.companyId}.`
    };
  })
  .build();
