import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (company or individual) in Rentman. Contacts can be linked to projects, invoices, and other entities. Optionally add contact persons after creation.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Contact / company name'),
      firstName: z.string().optional().describe('First name'),
      surName: z.string().optional().describe('Surname'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country code'),
      street: z.string().optional().describe('Street address'),
      postalCode: z.string().optional().describe('Postal code'),
      vatCode: z.string().optional().describe('VAT code'),
      tags: z.string().optional().describe('Tags / labels'),
      memo: z.string().optional().describe('Internal notes')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the newly created contact'),
      name: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.firstName) body.firstname = ctx.input.firstName;
    if (ctx.input.surName) body.surname = ctx.input.surName;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.street) body.street = ctx.input.street;
    if (ctx.input.postalCode) body.postal_code = ctx.input.postalCode;
    if (ctx.input.vatCode) body.vat_code = ctx.input.vatCode;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.create('contacts', body);
    let c = result.data as any;

    return {
      output: {
        contactId: c.id,
        name: c.name,
        createdAt: c.created
      },
      message: `Created contact **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Rentman. Provide the contact ID and the fields to update. Only provided fields will be modified.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      name: z.string().optional().describe('Updated contact / company name'),
      firstName: z.string().optional().describe('Updated first name'),
      surName: z.string().optional().describe('Updated surname'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      city: z.string().optional().describe('Updated city'),
      country: z.string().optional().describe('Updated country code'),
      street: z.string().optional().describe('Updated street address'),
      postalCode: z.string().optional().describe('Updated postal code'),
      vatCode: z.string().optional().describe('Updated VAT code'),
      tags: z.string().optional().describe('Updated tags'),
      memo: z.string().optional().describe('Updated internal notes')
    })
  )
  .output(
    z.object({
      contactId: z.number(),
      name: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.firstName !== undefined) body.firstname = ctx.input.firstName;
    if (ctx.input.surName !== undefined) body.surname = ctx.input.surName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.city !== undefined) body.city = ctx.input.city;
    if (ctx.input.country !== undefined) body.country = ctx.input.country;
    if (ctx.input.street !== undefined) body.street = ctx.input.street;
    if (ctx.input.postalCode !== undefined) body.postal_code = ctx.input.postalCode;
    if (ctx.input.vatCode !== undefined) body.vat_code = ctx.input.vatCode;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.memo !== undefined) body.memo = ctx.input.memo;

    let result = await client.update('contacts', ctx.input.contactId, body);
    let c = result.data as any;

    return {
      output: {
        contactId: c.id,
        name: c.name,
        updatedAt: c.modified
      },
      message: `Updated contact **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from Rentman by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.remove('contacts', ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact with ID **${ctx.input.contactId}**.`
    };
  })
  .build();
