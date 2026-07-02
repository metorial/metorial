import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact person associated with a customer in Firmao. A customer ID is required to link the contact to an existing customer record.`
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      label: z.string().optional().describe('Label/display name for the contact'),
      customerId: z.number().describe('ID of the customer this contact belongs to'),
      position: z.string().optional().describe('Job position/title'),
      department: z.string().optional().describe('Department name'),
      emails: z.array(z.string()).optional().describe('Email addresses'),
      phones: z.array(z.string()).optional().describe('Phone numbers')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      firstName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      firstName: ctx.input.firstName,
      customer: ctx.input.customerId
    };

    if (ctx.input.lastName) body.lastName = ctx.input.lastName;
    if (ctx.input.label) body.label = ctx.input.label;
    if (ctx.input.position) body.position = ctx.input.position;
    if (ctx.input.department) body.department = ctx.input.department;
    if (ctx.input.emails) body.emails = ctx.input.emails;
    if (ctx.input.phones) body.phones = ctx.input.phones;

    let result = await client.create('contacts', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        contactId: createdId,
        firstName: ctx.input.firstName
      },
      message: `Created contact **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}** (ID: ${createdId}).`
    };
  })
  .build();
