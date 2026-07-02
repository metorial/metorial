import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact record. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      companyId: z.number().optional().describe('Associated company ID'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional()
        })
        .optional()
        .describe('Address'),
      countryCode: z.string().optional().describe('Country code'),
      notes: z.string().optional().describe('Notes'),
      ownerId: z.number().optional().describe('Owner user ID'),
      isHot: z.boolean().optional().describe('Whether hot')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Updated contact ID'),
      updated: z.boolean().describe('Whether successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.companyId) body.company_id = ctx.input.companyId;
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode
      };
    }
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.isHot !== undefined) body.is_hot = ctx.input.isHot;

    await client.updateContact(ctx.input.contactId, body);

    return {
      output: {
        contactId: ctx.input.contactId,
        updated: true
      },
      message: `Updated contact **${ctx.input.contactId}**.`
    };
  })
  .build();
