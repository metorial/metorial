import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactPerson = SlateTool.create(spec, {
  name: 'Create Contact Person',
  key: 'create_contact_person',
  description: `Add a contact person to an existing contact in Rentman. Contact persons are individuals associated with a company/contact record.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the parent contact'),
      firstName: z.string().describe('First name of the contact person'),
      surName: z.string().optional().describe('Surname'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      function: z.string().optional().describe('Job title / function'),
      memo: z.string().optional().describe('Internal notes')
    })
  )
  .output(
    z.object({
      contactPersonId: z.number().describe('ID of the created contact person'),
      firstName: z.string().optional(),
      surName: z.string().optional(),
      email: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      firstname: ctx.input.firstName
    };

    if (ctx.input.surName) body.surname = ctx.input.surName;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.function) body.function = ctx.input.function;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.createNested(
      'contacts',
      ctx.input.contactId,
      'contactpersons',
      body
    );
    let cp = result.data as any;

    return {
      output: {
        contactPersonId: cp.id,
        firstName: cp.firstname,
        surName: cp.surname,
        email: cp.email,
        createdAt: cp.created
      },
      message: `Created contact person **${cp.firstname}${cp.surname ? ` ${cp.surname}` : ''}** (ID: ${cp.id}) under contact **${ctx.input.contactId}**.`
    };
  })
  .build();

export let updateContactPerson = SlateTool.create(spec, {
  name: 'Update Contact Person',
  key: 'update_contact_person',
  description: `Update an existing contact person in Rentman.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactPersonId: z.number().describe('ID of the contact person'),
      firstName: z.string().optional().describe('Updated first name'),
      surName: z.string().optional().describe('Updated surname'),
      email: z.string().optional().describe('Updated email'),
      phone: z.string().optional().describe('Updated phone'),
      function: z.string().optional().describe('Updated job title'),
      memo: z.string().optional().describe('Updated notes')
    })
  )
  .output(
    z.object({
      contactPersonId: z.number(),
      firstName: z.string().optional(),
      surName: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) body.firstname = ctx.input.firstName;
    if (ctx.input.surName !== undefined) body.surname = ctx.input.surName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.function !== undefined) body.function = ctx.input.function;
    if (ctx.input.memo !== undefined) body.memo = ctx.input.memo;

    let result = await client.update('contactpersons', ctx.input.contactPersonId, body);
    let cp = result.data as any;

    return {
      output: {
        contactPersonId: cp.id,
        firstName: cp.firstname,
        surName: cp.surname,
        updatedAt: cp.modified
      },
      message: `Updated contact person **${cp.firstname}${cp.surname ? ` ${cp.surname}` : ''}** (ID: ${cp.id}).`
    };
  })
  .build();

export let deleteContactPerson = SlateTool.create(spec, {
  name: 'Delete Contact Person',
  key: 'delete_contact_person',
  description: `Permanently delete a contact person from Rentman.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      contactPersonId: z.number().describe('ID of the contact person to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.remove('contactpersons', ctx.input.contactPersonId);

    return {
      output: { deleted: true },
      message: `Deleted contact person with ID **${ctx.input.contactPersonId}**.`
    };
  })
  .build();
