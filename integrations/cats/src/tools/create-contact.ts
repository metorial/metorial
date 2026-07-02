import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (individual at a company) in CATS. Contacts are linked to companies and represent your client-side relationships.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      companyId: z.number().optional().describe('Associated company ID'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Email address'),
            isPrimary: z.boolean().optional().describe('Whether primary')
          })
        )
        .optional()
        .describe('Email addresses'),
      phones: z
        .array(
          z.object({
            number: z.string().describe('Phone number'),
            extension: z.string().optional().describe('Extension'),
            type: z.enum(['home', 'cell', 'work', 'other']).optional().describe('Phone type')
          })
        )
        .optional()
        .describe('Phone numbers'),
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
      isHot: z.boolean().optional().describe('Mark as hot'),
      reportsTo: z.number().optional().describe('Contact ID this person reports to')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName
    };

    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.companyId) body.company_id = ctx.input.companyId;
    if (ctx.input.emails) {
      body.emails = ctx.input.emails.map(e => ({
        email: e.email,
        is_primary: e.isPrimary ?? false
      }));
    }
    if (ctx.input.phones) {
      body.phones = ctx.input.phones.map(p => ({
        number: p.number,
        extension: p.extension,
        type: p.type
      }));
    }
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
    if (ctx.input.reportsTo) body.reports_to = ctx.input.reportsTo;

    let result = await client.createContact(body);
    let contactId =
      result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';

    return {
      output: {
        contactId,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName
      },
      message: `Created contact **${ctx.input.firstName} ${ctx.input.lastName}** (ID: ${contactId}).`
    };
  })
  .build();
